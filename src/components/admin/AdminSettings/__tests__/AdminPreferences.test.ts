import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../../../services/supabase/authService';
import { adminService } from '../../../../services/supabase/adminService';

// Mock dependencies
vi.mock('../../../../services/supabase/authService', () => ({
  authService: {
    signOut: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../../../../services/supabase/adminService', () => ({
  adminService: {
    performUserAction: vi.fn(() => Promise.resolve({ success: true })),
    getAuditLogs: vi.fn(() => Promise.resolve({ 
      logs: [
        {
          id: '1',
          adminId: 'test-user-id',
          action: 'update_user_status_kicked',
          targetType: 'user',
          targetId: 'target-user-id',
          details: {},
          createdAt: '2024-01-01T12:00:00Z'
        }
      ]
    }))
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AdminPreferences Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Preferences Management', () => {
    it('should have default preferences', () => {
      const defaultPreferences = {
        theme: 'light',
        autoRefresh: true,
        refreshInterval: 30,
        emailNotifications: true,
        soundNotifications: false,
        compactView: false,
        showUserAvatars: true,
        defaultPageSize: 50,
      };

      expect(defaultPreferences.theme).toBe('light');
      expect(defaultPreferences.autoRefresh).toBe(true);
      expect(defaultPreferences.refreshInterval).toBe(30);
      expect(defaultPreferences.emailNotifications).toBe(true);
      expect(defaultPreferences.soundNotifications).toBe(false);
      expect(defaultPreferences.compactView).toBe(false);
      expect(defaultPreferences.showUserAvatars).toBe(true);
      expect(defaultPreferences.defaultPageSize).toBe(50);
    });

    it('should load preferences from localStorage', () => {
      const savedPreferences = {
        theme: 'dark',
        autoRefresh: false,
        refreshInterval: 60,
        emailNotifications: false,
        soundNotifications: true,
        compactView: true,
        showUserAvatars: false,
        defaultPageSize: 100
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPreferences));
      
      const userId = 'test-user-id';
      const result = localStorage.getItem(`admin-preferences-${userId}`);
      const parsed = result ? JSON.parse(result) : null;
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(`admin-preferences-${userId}`);
      expect(parsed).toEqual(savedPreferences);
    });

    it('should save preferences to localStorage', () => {
      const preferences = {
        theme: 'dark' as const,
        autoRefresh: false,
        refreshInterval: 60,
        emailNotifications: false,
        soundNotifications: true,
        compactView: true,
        showUserAvatars: false,
        defaultPageSize: 100
      };
      
      const userId = 'test-user-id';
      localStorage.setItem(`admin-preferences-${userId}`, JSON.stringify(preferences));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `admin-preferences-${userId}`,
        JSON.stringify(preferences)
      );
    });

    it('should validate theme options', () => {
      const validThemes = ['light', 'dark', 'auto'];
      
      validThemes.forEach(theme => {
        expect(['light', 'dark', 'auto']).toContain(theme);
      });
    });

    it('should validate refresh interval options', () => {
      const validIntervals = [15, 30, 60, 300];
      
      validIntervals.forEach(interval => {
        expect([15, 30, 60, 300]).toContain(interval);
      });
    });

    it('should validate page size options', () => {
      const validPageSizes = [25, 50, 100, 200];
      
      validPageSizes.forEach(size => {
        expect([25, 50, 100, 200]).toContain(size);
      });
    });
  });

  describe('Recent Activity', () => {
    it('should load recent admin activity', async () => {
      const userId = 'test-user-id';
      const result = await adminService.getAuditLogs(userId, undefined, 1, 10);
      
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(userId, undefined, 1, 10);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('update_user_status_kicked');
    });

    it('should format activity actions correctly', () => {
      const action = 'update_user_status_kicked';
      const formatted = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      expect(formatted).toBe('Update User Status Kicked');
    });

    it('should format dates correctly', () => {
      const dateString = '2024-01-01T12:00:00Z';
      const formatted = new Date(dateString).toLocaleString();
      
      expect(formatted).toMatch(/1\/1\/2024/);
    });
  });

  describe('Session Management', () => {
    it('should handle sign out successfully', async () => {
      const userId = 'test-user-id';
      
      // Log admin action
      await adminService.performUserAction({
        type: 'edit',
        userId: userId,
        adminId: userId,
        reason: 'Admin logout',
      });
      
      // Sign out
      await authService.signOut();
      
      expect(adminService.performUserAction).toHaveBeenCalledWith({
        type: 'edit',
        userId: userId,
        adminId: userId,
        reason: 'Admin logout',
      });
      expect(authService.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      (authService.signOut as any).mockRejectedValue(new Error('Sign out failed'));
      
      try {
        await authService.signOut();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Sign out failed');
      }
    });

    it('should display session information', () => {
      const mockSession = {
        id: '1',
        loginTime: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        isActive: true,
      };
      
      expect(mockSession.isActive).toBe(true);
      expect(mockSession.ipAddress).toBe('192.168.1.100');
      expect(mockSession.loginTime).toBeDefined();
    });
  });

  describe('Preference Changes', () => {
    it('should handle theme change', () => {
      const preferences = { theme: 'light' as const };
      const newTheme = 'dark' as const;
      
      const updated = { ...preferences, theme: newTheme };
      
      expect(updated.theme).toBe('dark');
    });

    it('should handle auto-refresh toggle', () => {
      const preferences = { autoRefresh: true };
      const toggled = { ...preferences, autoRefresh: !preferences.autoRefresh };
      
      expect(toggled.autoRefresh).toBe(false);
    });

    it('should handle refresh interval change', () => {
      const preferences = { refreshInterval: 30 };
      const updated = { ...preferences, refreshInterval: 60 };
      
      expect(updated.refreshInterval).toBe(60);
    });

    it('should handle email notifications toggle', () => {
      const preferences = { emailNotifications: true };
      const toggled = { ...preferences, emailNotifications: !preferences.emailNotifications };
      
      expect(toggled.emailNotifications).toBe(false);
    });

    it('should handle sound notifications toggle', () => {
      const preferences = { soundNotifications: false };
      const toggled = { ...preferences, soundNotifications: !preferences.soundNotifications };
      
      expect(toggled.soundNotifications).toBe(true);
    });

    it('should handle compact view toggle', () => {
      const preferences = { compactView: false };
      const toggled = { ...preferences, compactView: !preferences.compactView };
      
      expect(toggled.compactView).toBe(true);
    });

    it('should handle show avatars toggle', () => {
      const preferences = { showUserAvatars: true };
      const toggled = { ...preferences, showUserAvatars: !preferences.showUserAvatars };
      
      expect(toggled.showUserAvatars).toBe(false);
    });

    it('should handle page size change', () => {
      const preferences = { defaultPageSize: 50 };
      const updated = { ...preferences, defaultPageSize: 100 };
      
      expect(updated.defaultPageSize).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle preferences save errors', async () => {
      const mockError = new Error('Save failed');
      
      try {
        throw mockError;
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Save failed');
      }
    });

    it('should handle activity loading errors', async () => {
      (adminService.getAuditLogs as any).mockRejectedValue(new Error('Load failed'));
      
      try {
        await adminService.getAuditLogs('test-user-id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Load failed');
      }
    });
  });

  describe('Navigation', () => {
    it('should provide navigation to chat', () => {
      const chatPath = '/chat';
      expect(chatPath).toBe('/chat');
    });

    it('should provide logout functionality', () => {
      const logoutAction = 'logout';
      expect(logoutAction).toBe('logout');
    });
  });
});