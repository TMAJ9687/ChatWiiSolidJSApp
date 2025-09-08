import { useCallback } from 'react';
import { auditService, AuditLogEntry } from '../services/supabase/auditService';

interface UseAuditLoggerOptions {
  adminId: string;
  getClientInfo?: () => { ipAddress?: string; userAgent?: string };
}

export const useAuditLogger = ({ adminId, getClientInfo }: UseAuditLoggerOptions) => {
  const logAction = useCallback(
    async (
      action: string,
      targetType: AuditLogEntry['targetType'],
      targetId?: string,
      details: Record<string, any> = {}
    ) => {
      const metadata = getClientInfo?.();
      
      await auditService.logAction(
        adminId,
        action,
        targetType,
        targetId,
        details,
        metadata
      );
    },
    [adminId, getClientInfo]
  );

  const logBulkActions = useCallback(
    async (
      actions: Array<{
        action: string;
        targetType: AuditLogEntry['targetType'];
        targetId?: string;
        details?: Record<string, any>;
      }>
    ) => {
      const metadata = getClientInfo?.();
      
      await auditService.logBulkActions(adminId, actions, metadata);
    },
    [adminId, getClientInfo]
  );

  // Convenience methods for common admin actions
  const logUserAction = useCallback(
    (action: 'kick' | 'ban' | 'unban' | 'upgrade' | 'downgrade', userId: string, details: Record<string, any> = {}) => {
      return logAction(`user_${action}`, 'user', userId, details);
    },
    [logAction]
  );

  const logSettingUpdate = useCallback(
    (settingKey: string, oldValue: any, newValue: any) => {
      return logAction('setting_update', 'setting', settingKey, {
        oldValue,
        newValue,
        settingKey
      });
    },
    [logAction]
  );

  const logBotAction = useCallback(
    (action: 'create' | 'update' | 'delete' | 'toggle', botId: string, details: Record<string, any> = {}) => {
      return logAction(`bot_${action}`, 'bot', botId, details);
    },
    [logAction]
  );

  const logReportAction = useCallback(
    (action: 'review' | 'resolve' | 'dismiss', reportId: string, details: Record<string, any> = {}) => {
      return logAction(`report_${action}`, 'report', reportId, details);
    },
    [logAction]
  );

  const logFeedbackAction = useCallback(
    (action: 'review' | 'respond' | 'resolve', feedbackId: string, details: Record<string, any> = {}) => {
      return logAction(`feedback_${action}`, 'feedback', feedbackId, details);
    },
    [logAction]
  );

  const logAvatarAction = useCallback(
    (action: 'upload' | 'delete' | 'set_default', avatarId: string, details: Record<string, any> = {}) => {
      return logAction(`avatar_${action}`, 'avatar', avatarId, details);
    },
    [logAction]
  );

  const logProfanityAction = useCallback(
    (action: 'add_word' | 'remove_word' | 'bulk_import', wordId?: string, details: Record<string, any> = {}) => {
      return logAction(`profanity_${action}`, 'profanity', wordId, details);
    },
    [logAction]
  );

  return {
    logAction,
    logBulkActions,
    logUserAction,
    logSettingUpdate,
    logBotAction,
    logReportAction,
    logFeedbackAction,
    logAvatarAction,
    logProfanityAction
  };
};

// Higher-order function to wrap service methods with audit logging
export const withAuditLogging = <T extends (...args: any[]) => Promise<any>>(
  serviceMethod: T,
  auditLogger: ReturnType<typeof useAuditLogger>,
  actionName: string,
  targetType: AuditLogEntry['targetType'],
  getTargetId?: (...args: Parameters<T>) => string,
  getDetails?: (...args: Parameters<T>) => Record<string, any>
): T => {
  return (async (...args: Parameters<T>) => {
    const targetId = getTargetId?.(...args);
    const details = getDetails?.(...args) || {};
    
    try {
      const result = await serviceMethod(...args);
      
      // Log successful action
      await auditLogger.logAction(actionName, targetType, targetId, {
        ...details,
        success: true,
        result: typeof result === 'object' ? JSON.stringify(result) : result
      });
      
      return result;
    } catch (error) {
      // Log failed action
      await auditLogger.logAction(`${actionName}_failed`, targetType, targetId, {
        ...details,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }) as T;
};

// Utility to get client information
export const getClientInfo = () => {
  return {
    userAgent: navigator.userAgent,
    // Note: Getting real IP address requires server-side implementation
    // This is a placeholder for client-side detection
    ipAddress: undefined
  };
};