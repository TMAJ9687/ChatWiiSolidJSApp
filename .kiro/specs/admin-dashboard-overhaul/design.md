# Admin Dashboard Overhaul - Design Document

## Overview

This design document outlines the architecture and implementation approach for a comprehensive admin dashboard overhaul. The system will provide complete administrative control over users, content, settings, and platform configuration while maintaining real-time functionality and database integrity.

## Architecture

### Component Structure
```
src/
├── components/admin/
│   ├── UserManagement/
│   │   ├── VipUsersList.tsx
│   │   ├── StandardUsersList.tsx
│   │   ├── BotManagement.tsx
│   │   └── UserActionModal.tsx
│   ├── BanManagement/
│   │   ├── BannedUsersList.tsx
│   │   └── BanModal.tsx
│   ├── SiteManagement/
│   │   ├── GeneralSettings.tsx
│   │   ├── ChatSettings.tsx
│   │   ├── ProfanityManager.tsx
│   │   ├── VipPricing.tsx
│   │   └── AvatarManager.tsx
│   ├── ReportsAndFeedback/
│   │   ├── ReportsPanel.tsx
│   │   └── FeedbackPanel.tsx
│   └── AdminSettings/
│       ├── AdminProfile.tsx
│       └── AdminPreferences.tsx
├── services/supabase/
│   ├── adminService.ts (enhanced)
│   ├── botService.ts (new)
│   ├── banService.ts (new)
│   ├── siteSettingsService.ts (new)
│   └── kickService.ts (new)
└── types/
    ├── admin.types.ts (new)
    ├── bot.types.ts (new)
    └── siteSettings.types.ts (new)
```

### Database Schema Extensions

#### New Tables Required:
```sql
-- Site settings table
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bans table
CREATE TABLE bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  reason TEXT NOT NULL,
  duration_hours INTEGER, -- NULL for permanent
  banned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Bots table
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interests TEXT[],
  behavior_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profanity words table
CREATE TABLE profanity_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'nickname' or 'chat'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- 'user', 'setting', 'bot', etc.
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Components and Interfaces

### 1. Enhanced User Management

#### VipUsersList Component
```typescript
interface VipUsersListProps {
  onlineOnly?: boolean;
}

interface VipUserActions {
  kick: (userId: string, reason?: string) => Promise<void>;
  ban: (userId: string, reason: string, duration?: number) => Promise<void>;
  edit: (userId: string) => void;
  downgrade: (userId: string) => Promise<void>;
}
```

#### StandardUsersList Component
```typescript
interface StandardUsersListProps {
  onlineOnly: boolean; // Always true for standard users
}

interface StandardUserActions {
  kick: (userId: string, reason?: string) => Promise<void>;
  ban: (userId: string, reason: string, duration?: number) => Promise<void>;
  edit: (userId: string) => void;
  upgradeToVip: (userId: string, duration: number) => Promise<void>;
}
```

#### BotManagement Component
```typescript
interface Bot {
  id: string;
  userId: string;
  nickname: string;
  age: number;
  gender: 'male' | 'female';
  country: string;
  interests: string[];
  behaviorSettings: BotBehaviorSettings;
  isActive: boolean;
  createdAt: string;
}

interface BotBehaviorSettings {
  responseDelay: number; // milliseconds
  activityLevel: 'low' | 'medium' | 'high';
  conversationStyle: 'friendly' | 'professional' | 'casual';
}
```

### 2. Real-time Kick System

#### KickService Implementation
```typescript
class KickService {
  async kickUser(userId: string, reason?: string): Promise<void> {
    // 1. Update user status to 'kicked'
    // 2. Set user offline in presence
    // 3. Broadcast kick event to user's active sessions
    // 4. Log admin action
    // 5. Set temporary kick status (auto-expire after 24h)
  }

  async broadcastKickToUser(userId: string): Promise<void> {
    // Use Supabase realtime to notify user's active sessions
    // Trigger client-side redirect with warning message
  }
}
```

#### Client-side Kick Handler
```typescript
// In main chat component
const handleKickNotification = (payload: KickNotification) => {
  // Show warning message
  showKickWarning(payload.reason);
  
  // Redirect to landing page after 5 seconds
  setTimeout(() => {
    navigate('/');
  }, 5000);
};
```

### 3. Site Settings Management

#### SiteSettingsService
```typescript
interface SiteSettings {
  adsenseLinks: string[]; // 3 AdSense links
  maintenanceMode: boolean;
  maxImageUploadsStandard: number;
  vipPrices: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
}

class SiteSettingsService {
  async updateSetting(key: string, value: any): Promise<void>;
  async getSetting(key: string): Promise<any>;
  async getAllSettings(): Promise<SiteSettings>;
  async toggleMaintenanceMode(): Promise<boolean>;
}
```

### 4. Profanity Management

#### ProfanityService
```typescript
interface ProfanityWord {
  id: string;
  word: string;
  type: 'nickname' | 'chat';
  createdBy: string;
  createdAt: string;
}

class ProfanityService {
  async addWord(word: string, type: 'nickname' | 'chat'): Promise<void>;
  async removeWord(wordId: string): Promise<void>;
  async getWords(type?: 'nickname' | 'chat'): Promise<ProfanityWord[]>;
  async checkText(text: string, type: 'nickname' | 'chat'): Promise<boolean>;
}
```

### 5. Avatar Management System

#### AvatarService
```typescript
interface AvatarCollection {
  standard: {
    male: string[];
    female: string[];
  };
  vip: {
    male: string[];
    female: string[];
  };
}

class AvatarService {
  async uploadAvatar(file: File, category: 'standard' | 'vip', gender: 'male' | 'female'): Promise<string>;
  async deleteAvatar(avatarUrl: string): Promise<void>;
  async getAvatarCollection(): Promise<AvatarCollection>;
  async setDefaultAvatar(gender: 'male' | 'female', userType: 'standard' | 'vip', avatarUrl: string): Promise<void>;
}
```

## Data Models

### Enhanced User Model
```typescript
interface User {
  // Existing fields...
  kickedAt?: string;
  kickReason?: string;
  banExpiresAt?: string;
  banReason?: string;
  isBanned: boolean;
  isKicked: boolean;
}
```

### Ban Model
```typescript
interface Ban {
  id: string;
  userId?: string;
  ipAddress?: string;
  reason: string;
  durationHours?: number; // null for permanent
  bannedBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}
```

### Admin Audit Log Model
```typescript
interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'setting' | 'bot' | 'ban';
  targetId?: string;
  details: Record<string, any>;
  createdAt: string;
}
```

## Error Handling

### Kick Operation Error Handling
1. **Network Failures**: Retry mechanism with exponential backoff
2. **User Not Found**: Graceful error message to admin
3. **Permission Denied**: Validate admin permissions before action
4. **Database Constraints**: Handle foreign key violations gracefully

### Real-time Communication Errors
1. **Connection Loss**: Queue kick notifications for retry
2. **User Offline**: Store kick status for next login
3. **Multiple Sessions**: Broadcast to all user sessions

### Settings Update Errors
1. **Invalid Values**: Client-side validation before submission
2. **Concurrent Updates**: Optimistic locking with conflict resolution
3. **External Service Failures**: Rollback mechanism for AdSense updates

## Testing Strategy

### Unit Tests
- Service layer methods (kick, ban, settings updates)
- Profanity filter logic
- Avatar upload and management
- Bot creation and configuration

### Integration Tests
- Real-time kick notification flow
- Database transaction integrity
- Settings persistence and retrieval
- User status updates across tables

### End-to-End Tests
- Complete admin workflow (kick user → user receives notification → redirect)
- Settings update → immediate reflection on site
- Bot creation → appears in user list
- Ban user → access denied → unban → access restored

### Performance Tests
- Large user list rendering
- Real-time notification delivery
- Concurrent admin actions
- Database query optimization

## Security Considerations

### Admin Authentication
- Multi-factor authentication for admin accounts
- Session timeout and renewal
- Audit logging for all admin actions

### Data Protection
- Encrypt sensitive settings (AdSense links)
- Sanitize all user inputs
- Rate limiting for admin actions

### Access Control
- Role-based permissions (super admin vs regular admin)
- IP whitelisting for admin access
- Secure file upload for avatars

## Performance Optimizations

### Database Optimizations
- Indexes on frequently queried fields (user status, ban expiry)
- Connection pooling for admin operations
- Cached settings for frequently accessed values

### Real-time Optimizations
- Efficient channel subscriptions
- Batched notifications for bulk operations
- Connection management for admin dashboard

### UI Optimizations
- Virtual scrolling for large user lists
- Lazy loading of user details
- Optimistic updates with rollback capability

## Deployment Considerations

### Database Migrations
- Sequential migration scripts for new tables
- Data migration for existing users
- Rollback procedures for failed migrations

### Feature Flags
- Gradual rollout of new admin features
- A/B testing for UI improvements
- Emergency disable switches

### Monitoring and Alerting
- Admin action monitoring
- Performance metrics tracking
- Error rate alerting
- Real-time notification delivery monitoring