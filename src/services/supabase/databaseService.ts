import { supabase } from '../../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('DatabaseService');

export interface DatabaseTransaction {
  id: string;
  operations: DatabaseOperation[];
  status: 'pending' | 'committed' | 'rolled_back';
  createdAt: Date;
}

export interface DatabaseOperation {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data?: any;
  conditions?: Record<string, any>;
  expectedVersion?: number; // For optimistic locking
}

export interface OptimisticLockError extends Error {
  name: 'OptimisticLockError';
  currentVersion: number;
  expectedVersion: number;
}

export interface DatabaseConstraintError extends Error {
  name: 'DatabaseConstraintError';
  constraint: string;
  table: string;
}

class DatabaseService {
  private activeTransactions = new Map<string, DatabaseTransaction>();
  private connectionPool: any[] = [];
  private maxConnections = 10;

  /**
   * Create a new database transaction for complex admin operations
   */
  async createTransaction(): Promise<string> {
    const transactionId = crypto.randomUUID();
    const transaction: DatabaseTransaction = {
      id: transactionId,
      operations: [],
      status: 'pending',
      createdAt: new Date()
    };
    
    this.activeTransactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Add an operation to a transaction
   */
  addOperation(
    transactionId: string, 
    operation: DatabaseOperation
  ): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== 'pending') {
      throw new Error(`Cannot add operations to ${transaction.status} transaction`);
    }
    
    transaction.operations.push(operation);
  }

  /**
   * Execute all operations in a transaction with rollback capability
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // Execute all operations within a database transaction
      const { error } = await supabase.rpc('execute_admin_transaction', {
        operations: transaction.operations
      });

      if (error) {
        await this.rollbackTransaction(transactionId);
        throw this.mapDatabaseError(error);
      }

      transaction.status = 'committed';
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      throw error;
    } finally {
      // Clean up transaction after 1 hour
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 3600000);
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.status = 'rolled_back';
    
    // Log rollback for audit purposes
    logger.warn(`Transaction ${transactionId} rolled back`, {
      operations: transaction.operations,
      createdAt: transaction.createdAt
    });
  }

  /**
   * Implement optimistic locking for concurrent admin actions
   */
  async updateWithOptimisticLock(
    table: string,
    id: string,
    updates: Record<string, any>,
    expectedVersion: number
  ): Promise<any> {
    // First check current version
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select('version')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw this.mapDatabaseError(fetchError);
    }

    if (current.version !== expectedVersion) {
      const error = new Error(
        `Optimistic lock failed. Expected version ${expectedVersion}, got ${current.version}`
      ) as OptimisticLockError;
      error.name = 'OptimisticLockError';
      error.currentVersion = current.version;
      error.expectedVersion = expectedVersion;
      throw error;
    }

    // Update with incremented version
    const { data, error } = await supabase
      .from(table)
      .update({
        ...updates,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('version', expectedVersion) // Double-check version hasn't changed
      .select()
      .single();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data;
  }

  /**
   * Validate data consistency and constraints
   */
  async validateConstraints(
    table: string,
    data: Record<string, any>,
    operation: 'insert' | 'update'
  ): Promise<void> {
    const constraints = await this.getTableConstraints(table);
    
    for (const constraint of constraints) {
      await this.validateConstraint(constraint, data, operation);
    }
  }

  /**
   * Get database connection from pool
   */
  async getConnection(): Promise<any> {
    if (this.connectionPool.length > 0) {
      return this.connectionPool.pop();
    }

    if (this.connectionPool.length < this.maxConnections) {
      // Create new connection (Supabase handles connection pooling internally)
      return supabase;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.connectionPool.length > 0) {
          resolve(this.connectionPool.pop());
        } else {
          setTimeout(checkForConnection, 100);
        }
      };
      checkForConnection();
    });
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection: any): void {
    if (this.connectionPool.length < this.maxConnections) {
      this.connectionPool.push(connection);
    }
  }

  /**
   * Execute admin operation with connection pooling
   */
  async executeWithPooling<T>(
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    try {
      return await operation(connection);
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Map database errors to specific error types
   */
  private mapDatabaseError(error: PostgrestError): Error {
    if (error.code === '23505') { // Unique violation
      const constraintError = new Error(
        `Unique constraint violation: ${error.message}`
      ) as DatabaseConstraintError;
      constraintError.name = 'DatabaseConstraintError';
      constraintError.constraint = 'unique';
      constraintError.table = error.details || 'unknown';
      return constraintError;
    }

    if (error.code === '23503') { // Foreign key violation
      const constraintError = new Error(
        `Foreign key constraint violation: ${error.message}`
      ) as DatabaseConstraintError;
      constraintError.name = 'DatabaseConstraintError';
      constraintError.constraint = 'foreign_key';
      constraintError.table = error.details || 'unknown';
      return constraintError;
    }

    if (error.code === '23514') { // Check constraint violation
      const constraintError = new Error(
        `Check constraint violation: ${error.message}`
      ) as DatabaseConstraintError;
      constraintError.name = 'DatabaseConstraintError';
      constraintError.constraint = 'check';
      constraintError.table = error.details || 'unknown';
      return constraintError;
    }

    return new Error(`Database error: ${error.message}`);
  }

  /**
   * Get table constraints for validation
   */
  private async getTableConstraints(table: string): Promise<any[]> {
    // This would typically query information_schema or pg_constraint
    // For now, return predefined constraints for admin tables
    const tableConstraints: Record<string, any[]> = {
      users: [
        { type: 'not_null', column: 'email' },
        { type: 'unique', column: 'email' },
        { type: 'check', column: 'age', condition: 'age >= 13' }
      ],
      bans: [
        { type: 'not_null', column: 'reason' },
        { type: 'check', column: 'duration_hours', condition: 'duration_hours > 0' }
      ],
      site_settings: [
        { type: 'not_null', column: 'key' },
        { type: 'unique', column: 'key' }
      ]
    };

    return tableConstraints[table] || [];
  }

  /**
   * Validate individual constraint
   */
  private async validateConstraint(
    constraint: any,
    data: Record<string, any>,
    operation: 'insert' | 'update'
  ): Promise<void> {
    switch (constraint.type) {
      case 'not_null':
        if (operation === 'insert' && (data[constraint.column] === null || data[constraint.column] === undefined)) {
          throw new Error(`Column ${constraint.column} cannot be null`);
        }
        break;
      
      case 'unique':
        if (data[constraint.column] !== undefined) {
          // Check if value already exists (simplified check)
          // In real implementation, this would query the database
        }
        break;
      
      case 'check':
        // Validate check constraints (simplified)
        if (constraint.column === 'age' && data.age !== undefined && data.age < 13) {
          throw new Error('Age must be at least 13');
        }
        break;
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): DatabaseTransaction | undefined {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Clean up old transactions
   */
  cleanupTransactions(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    for (const [id, transaction] of this.activeTransactions.entries()) {
      if (transaction.createdAt < oneHourAgo) {
        this.activeTransactions.delete(id);
      }
    }
  }
}

export const databaseService = new DatabaseService();

// Clean up old transactions every hour
setInterval(() => {
  databaseService.cleanupTransactions();
}, 3600000);