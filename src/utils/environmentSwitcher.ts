import { createServiceLogger } from "./logger";

const logger = createServiceLogger('EnvironmentSwitcher');

export type SupabaseMode = 'old' | 'new';

export interface EnvironmentConfig {
  supabaseMode: SupabaseMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  imagekitConfigured: boolean;
  imagekitUrlEndpoint?: string;
  imagekitPublicKey?: string;
}

class EnvironmentSwitcher {

  // Get current environment configuration
  getCurrentConfig(): EnvironmentConfig {
    const supabaseMode = (import.meta.env.VITE_SUPABASE_MODE as SupabaseMode) || 'old';

    const supabaseUrl = supabaseMode === 'new'
      ? import.meta.env.VITE_NEW_SUPABASE_URL
      : import.meta.env.VITE_SUPABASE_URL;

    const supabaseAnonKey = supabaseMode === 'new'
      ? import.meta.env.VITE_NEW_SUPABASE_ANON_KEY
      : import.meta.env.VITE_SUPABASE_ANON_KEY;

    const imagekitUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
    const imagekitPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
    const imagekitConfigured = !!(imagekitUrlEndpoint && imagekitPublicKey);

    return {
      supabaseMode,
      supabaseUrl,
      supabaseAnonKey,
      imagekitConfigured,
      imagekitUrlEndpoint,
      imagekitPublicKey
    };
  }

  // Check if all required environment variables are present
  validateEnvironment(): { isValid: boolean; missingVars: string[]; warnings: string[] } {
    const config = this.getCurrentConfig();
    const missingVars: string[] = [];
    const warnings: string[] = [];

    // Check Supabase configuration
    if (!config.supabaseUrl) {
      if (config.supabaseMode === 'new') {
        missingVars.push('VITE_NEW_SUPABASE_URL');
      } else {
        missingVars.push('VITE_SUPABASE_URL');
      }
    }

    if (!config.supabaseAnonKey) {
      if (config.supabaseMode === 'new') {
        missingVars.push('VITE_NEW_SUPABASE_ANON_KEY');
      } else {
        missingVars.push('VITE_SUPABASE_ANON_KEY');
      }
    }

    // Check ImageKit configuration (warnings only)
    if (!config.imagekitConfigured) {
      if (!config.imagekitUrlEndpoint) {
        warnings.push('VITE_IMAGEKIT_URL_ENDPOINT not configured - will use Supabase Storage');
      }
      if (!config.imagekitPublicKey) {
        warnings.push('VITE_IMAGEKIT_PUBLIC_KEY not configured - will use Supabase Storage');
      }
    }

    return {
      isValid: missingVars.length === 0,
      missingVars,
      warnings
    };
  }

  // Log current environment status
  logEnvironmentStatus(): void {
    const config = this.getCurrentConfig();
    const validation = this.validateEnvironment();

    console.group('🔧 Environment Configuration');
    console.log(`📊 Supabase Mode: ${config.supabaseMode}`);
    console.log(`🗄️ Database URL: ${config.supabaseUrl}`);
    console.log(`🔑 Auth Key: ${config.supabaseAnonKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🖼️ ImageKit: ${config.imagekitConfigured ? '✅ Configured' : '⚠️ Using Supabase Storage'}`);

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (!validation.isValid) {
      console.error('❌ Missing required environment variables:');
      validation.missingVars.forEach(missing => console.error(`  - ${missing}`));
    }

    console.groupEnd();
  }

  // Get storage provider information
  getStorageProvider(): { provider: 'imagekit' | 'supabase'; configured: boolean } {
    const config = this.getCurrentConfig();
    return {
      provider: config.imagekitConfigured ? 'imagekit' : 'supabase',
      configured: config.imagekitConfigured
    };
  }

  // Check if we're using the new Supabase environment
  isUsingNewSupabase(): boolean {
    return this.getCurrentConfig().supabaseMode === 'new';
  }

  // Check if ImageKit is properly configured
  isImageKitConfigured(): boolean {
    return this.getCurrentConfig().imagekitConfigured;
  }

  // Generate environment switching instructions
  getEnvironmentSwitchingInstructions(): string {
    const config = this.getCurrentConfig();

    return `
🔄 Environment Switching Instructions:

Current Mode: ${config.supabaseMode} Supabase
Storage: ${config.imagekitConfigured ? 'ImageKit' : 'Supabase Storage'}

To switch to NEW Supabase:
1. Update your .env file:
   VITE_SUPABASE_MODE=new
   VITE_NEW_SUPABASE_URL=your_new_project_url
   VITE_NEW_SUPABASE_ANON_KEY=your_new_anon_key

To switch to OLD Supabase:
1. Update your .env file:
   VITE_SUPABASE_MODE=old

To enable ImageKit:
1. Update your .env file:
   VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
   VITE_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key

2. Restart your development server: npm run dev
    `.trim();
  }

  // Create a migration status report
  getMigrationStatus(): {
    oldSupabaseReady: boolean;
    newSupabaseReady: boolean;
    imagekitReady: boolean;
    currentMode: SupabaseMode;
    readyToMigrate: boolean;
  } {
    const oldSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const oldSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const newSupabaseUrl = import.meta.env.VITE_NEW_SUPABASE_URL;
    const newSupabaseKey = import.meta.env.VITE_NEW_SUPABASE_ANON_KEY;
    const imagekitUrl = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
    const imagekitKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;

    const oldSupabaseReady = !!(oldSupabaseUrl && oldSupabaseKey);
    const newSupabaseReady = !!(newSupabaseUrl && newSupabaseKey);
    const imagekitReady = !!(imagekitUrl && imagekitKey);
    const currentMode = (import.meta.env.VITE_SUPABASE_MODE as SupabaseMode) || 'old';

    return {
      oldSupabaseReady,
      newSupabaseReady,
      imagekitReady,
      currentMode,
      readyToMigrate: newSupabaseReady || imagekitReady
    };
  }
}

export const environmentSwitcher = new EnvironmentSwitcher();

// Initialize and log environment status on module load
if (typeof window !== 'undefined') {
  environmentSwitcher.logEnvironmentStatus();
}