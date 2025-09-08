import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { databaseService, DatabaseOperation, OptimisticLockError, DatabaseConstraintError } from '../databaseService';
import { supabase } from '../../../config/supabase';

// Mock supabase
vi.mock('../../../config/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any active transactions
    const activeTransactions = (databaseService as any).activeTransactions;
    activeTransactions.clear();
  });

  describe('Transaction Management', () => {
    it('should create a new transaction', async () => {
      const transactionId = await databaseService.createTransaction();
      
      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe('string');
      
      const transaction = databaseService.getTransactionStatus(transactionId);
      expect(transaction).toBeDefined();
      expect(transaction?.status).toBe('pending');
      expect(transaction?.operations).toEqual([]);
    });

    it('should add operations to a transaction', async () => {
      const transactionId = await databaseService.createTransaction();
      const operation: DatabaseOperation = {
        table: 'users',
        operation: 'update',
        data: { nickname: 'newname' },
        conditions: { id: 'user-123' }
      };

      databaseService.addOperation(transactionId, operation);
      
      const transaction = databaseService.getTransactionStatus(transactionId);
      expect(transaction?.operations).toHaveLength(1);
      expect(transaction?.operations[0]).toEqual(operation);
    });

    it('should not allow adding operations to non-existent transaction', () => {
      const operation: DatabaseOperation = {
        table: 'users',
        operation: 'update',
        data: { nickname: 'newname' },
        conditions: { id: 'user-123' }
      };

      expect(() => {
        databaseService.addOperation('non-existent', operation);
      }).toThrow('Transaction non-existent not found');
    });

    it('should not allow adding operations to committed transaction', async () => {
      const transactionId = await databaseService.createTransaction();
      
      // Mock successful RPC call
      (supabase.rpc as any).mockResolvedValue({ error: null });
      
      await databaseService.commitTransaction(transactionId);
      
      const operation: DatabaseOperation = {
        table: 'users',
        operation: 'update',
        data: { nickname: 'newname' },
        conditions: { id: 'user-123' }
      };

      expect(() => {
        databaseService.addOperation(transactionId, operation);
      }).toThrow('Cannot add operations to committed transaction');
    });

    it('should commit transaction successfully', async () => {
      const transactionId = await databaseService.createTransaction();
      const operation: DatabaseOperation = {
        table: 'users',
        operation: 'update',
        data: { nickname: 'newname' },
        conditions: { id: 'user-123' }
      };

      databaseService.addOperation(transactionId, operation);
      
      // Mock successful RPC call
      (supabase.rpc as any).mockResolvedValue({ error: null });
      
      await databaseService.commitTransaction(transactionId);
      
      const transaction = databaseService.getTransactionStatus(transactionId);
      expect(transaction?.status).toBe('committed');
      expect(supabase.rpc).toHaveBeenCalledWith('execute_admin_transaction', {
        operations: [operation]
      });
    });

    it('should rollback transaction on error', async () => {
      const transactionId = await databaseService.createTransaction();
      const operation: DatabaseOperation = {
        table: 'users',
        operation: 'update',
        data: { nickname: 'newname' },
        conditions: { id: 'user-123' }
      };

      databaseService.addOperation(transactionId, operation);
      
      // Mock RPC error
      (supabase.rpc as any).mockResolvedValue({ 
        error: { message: 'Database error', code: '23505' }
      });
      
      await expect(databaseService.commitTransaction(transactionId)).rejects.toThrow();
      
      const transaction = databaseService.getTransactionStatus(transactionId);
      expect(transaction?.status).toBe('rolled_back');
    });
  });

  describe('Optimistic Locking', () => {
    it('should update with optimistic lock successfully', async () => {
      const mockData = { version: 5 };
      const mockUpdatedData = { id: 'test-id', nickname: 'updated', version: 6 };

      // Mock version check
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdatedData, error: null })
              })
            })
          })
        })
      });

      const result = await databaseService.updateWithOptimisticLock(
        'users',
        'test-id',
        { nickname: 'updated' },
        5
      );

      expect(result).toEqual(mockUpdatedData);
    });

    it('should throw OptimisticLockError when version mismatch', async () => {
      const mockData = { version: 6 }; // Different version

      // Mock version check
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      });

      await expect(
        databaseService.updateWithOptimisticLock(
          'users',
          'test-id',
          { nickname: 'updated' },
          5
        )
      ).rejects.toThrow(OptimisticLockError);
    });
  });

  describe('Connection Pooling', () => {
    it('should execute operation with connection pooling', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');
      
      const result = await databaseService.executeWithPooling(mockOperation);
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledWith(supabase);
    });

    it('should handle connection pooling errors gracefully', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Connection error'));
      
      await expect(
        databaseService.executeWithPooling(mockOperation)
      ).rejects.toThrow('Connection error');
    });
  });

  describe('Constraint Validation', () => {
    it('should validate constraints successfully', async () => {
      const data = { email: 'test@example.com', age: 25 };
      
      await expect(
        databaseService.validateConstraints('users', data, 'insert')
      ).resolves.not.toThrow();
    });

    it('should validate age constraint', async () => {
      const data = { email: 'test@example.com', age: 12 };
      
      await expect(
        databaseService.validateConstraints('users', data, 'insert')
      ).rejects.toThrow('Age must be at least 13');
    });
  });

  describe('Error Mapping', () => {
    it('should map unique constraint violation', async () => {
      const transactionId = await databaseService.createTransaction();
      
      // Mock unique constraint violation
      (supabase.rpc as any).mockResolvedValue({ 
        error: { 
          message: 'duplicate key value violates unique constraint',
          code: '23505',
          details: 'users_email_key'
        }
      });
      
      await expect(databaseService.commitTransaction(transactionId)).rejects.toThrow(DatabaseConstraintError);
    });

    it('should map foreign key constraint violation', async () => {
      const transactionId = await databaseService.createTransaction();
      
      // Mock foreign key constraint violation
      (supabase.rpc as any).mockResolvedValue({ 
        error: { 
          message: 'insert or update on table violates foreign key constraint',
          code: '23503',
          details: 'bans_user_id_fkey'
        }
      });
      
      await expect(databaseService.commitTransaction(transactionId)).rejects.toThrow(DatabaseConstraintError);
    });

    it('should map check constraint violation', async () => {
      const transactionId = await databaseService.createTransaction();
      
      // Mock check constraint violation
      (supabase.rpc as any).mockResolvedValue({ 
        error: { 
          message: 'new row violates check constraint',
          code: '23514',
          details: 'users_age_check'
        }
      });
      
      await expect(databaseService.commitTransaction(transactionId)).rejects.toThrow(DatabaseConstraintError);
    });
  });

  describe('Transaction Cleanup', () => {
    it('should clean up old transactions', async () => {
      const transactionId = await databaseService.createTransaction();
      
      // Manually set old timestamp
      const transaction = databaseService.getTransactionStatus(transactionId);
      if (transaction) {
        transaction.createdAt = new Date(Date.now() - 7200000); // 2 hours ago
      }
      
      databaseService.cleanupTransactions();
      
      expect(databaseService.getTransactionStatus(transactionId)).toBeUndefined();
    });

    it('should not clean up recent transactions', async () => {
      const transactionId = await databaseService.createTransaction();
      
      databaseService.cleanupTransactions();
      
      expect(databaseService.getTransactionStatus(transactionId)).toBeDefined();
    });
  });
});