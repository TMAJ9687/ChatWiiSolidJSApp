export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'setting' | 'bot' | 'ban' | 'report' | 'feedback';
  targetId?: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface AdminActionResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface UserAction {
  type: 'kick' | 'ban' | 'edit' | 'upgrade' | 'downgrade' | 'delete';
  userId: string;
  reason?: string;
  duration?: number; // For bans, in hours
  adminId: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalReports: number;
  pendingReports: number;
  blockedUsers: number;
  totalFeedback: number;
  unreadFeedback: number;
}

export interface UserSearchFilters {
  search?: string;
  role?: string;
  status?: string;
  gender?: string;
  country?: string;
  onlineOnly?: boolean;
}

export interface ReportWithUsers {
  id: string;
  reporterId: string;
  reportedId: string;
  messageId?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  reporter: {
    id: string;
    nickname: string;
    role: string;
  };
  reported: {
    id: string;
    nickname: string;
    role: string;
  };
}

export interface AdminRetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

export interface Feedback {
  id: string;
  userId?: string;
  email?: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'in_progress' | 'resolved';
  category?: 'bug' | 'feature' | 'complaint' | 'suggestion' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackWithUser extends Feedback {
  user?: {
    id: string;
    nickname: string;
    role: string;
  };
}