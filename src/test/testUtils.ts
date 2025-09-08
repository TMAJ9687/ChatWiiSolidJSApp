import { vi } from 'vitest';

// Common mock implementations for Supabase
export const createMockSupabaseChain = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  containedBy: vi.fn().mockReturnThis(),
  rangeGt: vi.fn().mockReturnThis(),
  rangeGte: vi.fn().mockReturnThis(),
  rangeLt: vi.fn().mockReturnThis(),
  rangeLte: vi.fn().mockReturnThis(),
  rangeAdjacent: vi.fn().mockReturnThis(),
  overlaps: vi.fn().mockReturnThis(),
  textSearch: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  abortSignal: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  csv: vi.fn().mockReturnThis(),
  geojson: vi.fn().mockReturnThis(),
  explain: vi.fn().mockReturnThis(),
  rollback: vi.fn().mockReturnThis(),
  returns: vi.fn().mockReturnThis(),
});

export const createMockSupabaseStorageChain = () => ({
  upload: vi.fn(),
  download: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  copy: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  getPublicUrl: vi.fn(),
});

export const createMockSupabaseRealtimeChannel = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  track: vi.fn(),
  untrack: vi.fn(),
  send: vi.fn(),
});

// Mock file creation helper
export const createMockFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024 * 1024 // 1MB
): File => {
  const blob = new Blob(['mock file content'], { type });
  Object.defineProperty(blob, 'size', { value: size });
  return new File([blob], name, { type, lastModified: Date.now() });
};

// Mock user data
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  nickname: 'TestUser',
  gender: 'male' as const,
  age: 25,
  country: 'US',
  role: 'standard' as const,
  status: 'active' as const,
  online: true,
  avatar: '/avatars/standard/male.png',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock admin user data
export const createMockAdminUser = (overrides = {}) => ({
  id: 'admin-123',
  nickname: 'AdminUser',
  gender: 'male' as const,
  age: 30,
  country: 'US',
  role: 'admin' as const,
  status: 'active' as const,
  online: true,
  avatar: '/avatars/admin.png',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock bot data
export const createMockBot = (overrides = {}) => ({
  id: 'bot-123',
  userId: 'user-bot-123',
  nickname: 'TestBot',
  age: 25,
  gender: 'male' as const,
  country: 'US',
  interests: ['gaming', 'music'],
  behaviorSettings: {
    responseDelay: 1000,
    activityLevel: 'medium' as const,
    conversationStyle: 'friendly' as const,
  },
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock ban data
export const createMockBan = (overrides = {}) => ({
  id: 'ban-123',
  userId: 'user-123',
  ipAddress: null,
  reason: 'Test ban',
  durationHours: 24,
  bannedBy: 'admin-123',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-02T00:00:00Z',
  isActive: true,
  ...overrides,
});

// Mock audit log data
export const createMockAuditLog = (overrides = {}) => ({
  id: 'audit-123',
  adminId: 'admin-123',
  action: 'kick',
  targetType: 'user',
  targetId: 'user-123',
  details: { reason: 'Test action' },
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Test timeout helper
export const withTimeout = (ms: number = 1000) => ({ timeout: ms });

// Async test helper
export const waitFor = async (condition: () => boolean, timeout: number = 1000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Mock DOM APIs for testing
export const setupDOMAPIs = () => {
  // Mock Image
  Object.defineProperty(global, 'Image', {
    value: class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      
      set src(value: string) {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    },
    writable: true,
  });

  // Mock URL
  Object.defineProperty(global, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
  });

  // Mock Canvas
  Object.defineProperty(global, 'HTMLCanvasElement', {
    value: class MockCanvas {
      width = 0;
      height = 0;
      
      getContext() {
        return {
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
          setTransform: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          translate: vi.fn(),
          transform: vi.fn(),
          resetTransform: vi.fn(),
        };
      }
      
      toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number) {
        const mockBlob = new Blob(['mock'], { type: type || 'image/jpeg' });
        setTimeout(() => callback(mockBlob), 0);
      }
      
      toDataURL() {
        return 'data:image/jpeg;base64,mock';
      }
    },
    writable: true,
  });

  // Mock document
  Object.defineProperty(global, 'document', {
    value: {
      createElement: vi.fn((tagName: string) => {
        if (tagName === 'canvas') {
          return new (global as any).HTMLCanvasElement();
        }
        return {};
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      hidden: false,
    },
    writable: true,
  });

  // Mock window
  Object.defineProperty(global, 'window', {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      location: { href: 'http://localhost:3000' },
    },
    writable: true,
  });

  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: {
      sendBeacon: vi.fn(() => true),
      userAgent: 'Mozilla/5.0 (Test)',
    },
    writable: true,
  });
};

// Reset all mocks helper
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};