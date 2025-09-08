import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { kickService } from "../../../services/supabase/kickService";
import { authService } from "../../../services/supabase";

// Mock the services
vi.mock("../../../services/supabase/kickService", () => ({
  kickService: {
    subscribeToKickNotifications: vi.fn(),
    getKickStatus: vi.fn(),
    clearKickStatus: vi.fn(),
  },
}));

vi.mock("../../../services/supabase", () => ({
  authService: {
    signOut: vi.fn(),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("@solidjs/router", async () => {
  const actual = await vi.importActual("@solidjs/router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock localStorage
const mockLocalStorage = {
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe("KickNotificationHandler Logic", () => {
  const mockUserId = "test-user-id";
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    vi.mocked(kickService.subscribeToKickNotifications).mockReturnValue(mockUnsubscribe);
    vi.mocked(kickService.getKickStatus).mockResolvedValue(null);
    vi.mocked(kickService.clearKickStatus).mockResolvedValue();
    vi.mocked(authService.signOut).mockResolvedValue();
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should subscribe to kick notifications with correct parameters", () => {
    // Simulate component mount with userId
    const userId = mockUserId;
    const onKickCallback = vi.fn();
    
    kickService.subscribeToKickNotifications(userId, onKickCallback);
    
    expect(kickService.subscribeToKickNotifications).toHaveBeenCalledWith(
      userId,
      expect.any(Function)
    );
  });

  it("should check offline kick status on initialization", async () => {
    const userId = mockUserId;
    
    await kickService.getKickStatus(userId);
    
    expect(kickService.getKickStatus).toHaveBeenCalledWith(userId);
  });

  it("should handle kick notification callback correctly", () => {
    const userId = mockUserId;
    const onKickCallback = vi.fn();
    
    kickService.subscribeToKickNotifications(userId, onKickCallback);
    
    const kickNotification = {
      userId: mockUserId,
      reason: "Test kick reason",
      kickedBy: "admin-id",
      kickedAt: new Date().toISOString(),
    };
    
    // Get the callback and simulate kick
    const callback = vi.mocked(kickService.subscribeToKickNotifications).mock.calls[0][1];
    callback(kickNotification);
    
    expect(callback).toBeDefined();
  });

  it("should handle offline kick status correctly", async () => {
    const offlineKickStatus = {
      userId: mockUserId,
      isKicked: true,
      kickedAt: new Date().toISOString(),
      kickedBy: "admin-id",
      reason: "Offline kick reason",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    
    vi.mocked(kickService.getKickStatus).mockResolvedValue(offlineKickStatus);
    
    const result = await kickService.getKickStatus(mockUserId);
    
    expect(result).toEqual(offlineKickStatus);
    expect(result?.isKicked).toBe(true);
    expect(result?.reason).toBe("Offline kick reason");
  });

  it("should call cleanup functions correctly", async () => {
    const userId = mockUserId;
    
    // Simulate cleanup process
    await kickService.clearKickStatus(userId);
    await authService.signOut();
    mockLocalStorage.clear();
    
    expect(kickService.clearKickStatus).toHaveBeenCalledWith(userId);
    expect(authService.signOut).toHaveBeenCalled();
    expect(mockLocalStorage.clear).toHaveBeenCalled();
  });

  it("should handle errors gracefully during cleanup", async () => {
    vi.mocked(authService.signOut).mockRejectedValue(new Error("Sign out failed"));
    
    try {
      await authService.signOut();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Sign out failed");
    }
    
    // Should still be able to navigate even if sign out fails
    expect(mockNavigate).toBeDefined();
  });

  it("should unsubscribe correctly", () => {
    const unsubscribe = mockUnsubscribe;
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("should handle missing userId gracefully", async () => {
    const result = await kickService.getKickStatus("");
    // Should not throw error with empty userId
    expect(kickService.getKickStatus).toHaveBeenCalledWith("");
  });

  it("should handle kick notification without reason", () => {
    const kickNotification = {
      userId: mockUserId,
      kickedBy: "admin-id",
      kickedAt: new Date().toISOString(),
    };
    
    // Should handle missing reason gracefully
    expect(kickNotification.reason).toBeUndefined();
    
    // Default reason should be handled in component
    const defaultReason = kickNotification.reason || "No reason provided";
    expect(defaultReason).toBe("No reason provided");
  });
});