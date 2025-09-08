import { supabase } from '../../config/supabase';
import { databaseService } from './databaseService';

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'setting' | 'bot' | 'ban' | 'report' | 'feedback' | 'avatar' | 'profanity';
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  version: number;
}

export interface AuditLogFilter {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogExport {
  entries: AuditLogEntry[];
  totalCount: number;
  exportedAt: string;
  exportedBy: string;
  filters: AuditLogFilter;
}

class AuditService {
  /**
   * Log an admin action to the audit trail
   */
  async logAction(
    adminId: string,
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId?: string,
    details: Record<string, any> = {},
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const auditEntry = {
        id: crypto.randomUUID(),
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('admin_audit_log')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Audit logging should not break main functionality
    }
  }

  /**
   * Log multiple actions in a transaction
   */
  async logBulkActions(
    adminId: string,
    actions: Array<{
      action: string;
      targetType: AuditLogEntry['targetType'];
      targetId?: string;
      details?: Record<string, any>;
    }>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const transactionId = await databaseService.createTransaction();

    try {
      for (const actionData of actions) {
        const auditEntry = {
          id: crypto.randomUUID(),
          admin_id: adminId,
          action: actionData.action,
          target_type: actionData.targetType,
          target_id: actionData.targetId,
          details: actionData.details || {},
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          created_at: new Date().toISOString()
        };

        databaseService.addOperation(transactionId, {
          table: 'admin_audit_log',
          operation: 'insert',
          data: auditEntry
        });
      }

      await databaseService.commitTransaction(transactionId);
    } catch (error) {
      await databaseService.rollbackTransaction(transactionId);
      console.error('Bulk audit logging failed:', error);
    }
  }

  /**
   * Get audit log entries with filtering and pagination
   */
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<{
    entries: AuditLogEntry[];
    totalCount: number;
  }> {
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(id, nickname, email)
      `, { count: 'exact' });

    // Apply filters
    if (filter.adminId) {
      query = query.eq('admin_id', filter.adminId);
    }

    if (filter.action) {
      query = query.ilike('action', `%${filter.action}%`);
    }

    if (filter.targetType) {
      query = query.eq('target_type', filter.targetType);
    }

    if (filter.targetId) {
      query = query.eq('target_id', filter.targetId);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom);
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo);
    }

    // Apply pagination
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return {
      entries: data || [],
      totalCount: count || 0
    };
  }

  /**
   * Get audit logs for a specific target
   */
  async getTargetAuditHistory(
    targetType: AuditLogEntry['targetType'],
    targetId: string
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(id, nickname, email)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch target audit history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get admin activity summary
   */
  async getAdminActivitySummary(
    adminId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: AuditLogEntry[];
  }> {
    let query = supabase
      .from('admin_audit_log')
      .select('action, created_at, target_type, details')
      .eq('admin_id', adminId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch admin activity: ${error.message}`);
    }

    const entries = data || [];
    const actionsByType: Record<string, number> = {};

    entries.forEach(entry => {
      actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
    });

    return {
      totalActions: entries.length,
      actionsByType,
      recentActions: entries.slice(0, 10) as AuditLogEntry[]
    };
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    filter: AuditLogFilter,
    exportedBy: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<AuditLogExport | string> {
    // Get all matching entries (remove pagination for export)
    const exportFilter = { ...filter, limit: undefined, offset: undefined };
    const { entries, totalCount } = await this.getAuditLogs(exportFilter);

    const exportData: AuditLogExport = {
      entries,
      totalCount,
      exportedAt: new Date().toISOString(),
      exportedBy,
      filters: filter
    };

    // Log the export action
    await this.logAction(
      exportedBy,
      'audit_log_export',
      'setting',
      undefined,
      {
        filters: filter,
        totalRecords: totalCount,
        format
      }
    );

    if (format === 'csv') {
      return this.convertToCSV(entries);
    }

    return exportData;
  }

  /**
   * Search audit logs by text
   */
  async searchAuditLogs(
    searchTerm: string,
    filter: AuditLogFilter = {}
  ): Promise<{
    entries: AuditLogEntry[];
    totalCount: number;
  }> {
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(id, nickname, email)
      `, { count: 'exact' });

    // Text search in action and details
    query = query.or(`action.ilike.%${searchTerm}%,details.cs.{"search":"${searchTerm}"}`);

    // Apply other filters
    if (filter.adminId) {
      query = query.eq('admin_id', filter.adminId);
    }

    if (filter.targetType) {
      query = query.eq('target_type', filter.targetType);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom);
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo);
    }

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search audit logs: ${error.message}`);
    }

    return {
      entries: data || [],
      totalCount: count || 0
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
      .from('admin_audit_log')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup old audit logs: ${error.message}`);
    }

    const deletedCount = data?.length || 0;

    // Log the cleanup action
    if (deletedCount > 0) {
      await this.logAction(
        'system',
        'audit_log_cleanup',
        'setting',
        undefined,
        {
          deletedCount,
          retentionDays,
          cutoffDate: cutoffDate.toISOString()
        }
      );
    }

    return deletedCount;
  }

  /**
   * Get audit log statistics
   */
  async getAuditStatistics(dateFrom?: string, dateTo?: string): Promise<{
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByTargetType: Record<string, number>;
    entriesByAdmin: Record<string, number>;
    dailyActivity: Array<{ date: string; count: number }>;
  }> {
    let query = supabase
      .from('admin_audit_log')
      .select(`
        action,
        target_type,
        admin_id,
        created_at,
        admin:admin_id(nickname)
      `);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit statistics: ${error.message}`);
    }

    const entries = data || [];
    const entriesByAction: Record<string, number> = {};
    const entriesByTargetType: Record<string, number> = {};
    const entriesByAdmin: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    entries.forEach(entry => {
      // Count by action
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;

      // Count by target type
      entriesByTargetType[entry.target_type] = (entriesByTargetType[entry.target_type] || 0) + 1;

      // Count by admin
      const adminName = entry.admin?.nickname || entry.admin_id;
      entriesByAdmin[adminName] = (entriesByAdmin[adminName] || 0) + 1;

      // Count by day
      const date = new Date(entry.created_at).toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      entriesByAction,
      entriesByTargetType,
      entriesByAdmin,
      dailyActivity: Object.entries(dailyActivity)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(entries: AuditLogEntry[]): string {
    if (entries.length === 0) {
      return 'No data to export';
    }

    const headers = [
      'ID',
      'Admin ID',
      'Action',
      'Target Type',
      'Target ID',
      'Details',
      'IP Address',
      'User Agent',
      'Created At'
    ];

    const csvRows = [headers.join(',')];

    entries.forEach(entry => {
      const row = [
        entry.id,
        entry.adminId,
        entry.action,
        entry.targetType,
        entry.targetId || '',
        JSON.stringify(entry.details).replace(/"/g, '""'),
        entry.ipAddress || '',
        entry.userAgent || '',
        entry.createdAt
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    return csvRows.join('\n');
  }
}

export const auditService = new AuditService();