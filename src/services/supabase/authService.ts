import { supabase } from "../../config/supabase";
import { presenceService } from "./presenceService";
import { connectionService } from "../connectionService";
import type { User } from "../../types/user.types";
import type { Database } from "../../types/database.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('AuthService');

type SupabaseUser = Database['public']['Tables']['users']['Row'];
type SupabaseUserInsert = Database['public']['Tables']['users']['Insert'];

class AuthService {
  private currentUser: any = null;

  constructor() {
    // Listen to auth state changes and update currentUser
    supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user || null;
    });
  }

  // Sign in with email (for admin users)
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to sign in with email");
      }

      this.currentUser = authData.user;

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error("User profile not found. Please contact administrator.");
      }

      // Convert and return user
      return this.convertSupabaseUser(userProfile);
    } catch (error) {
      logger.error("Error signing in with email:", error);
      throw error;
    }
  }

  // Create anonymous user and profile
  async signInAnonymously(userData: {
    nickname: string;
    gender: "male" | "female";
    age: number;
    country: string;
  }): Promise<User> {
    try {
      // Sign in anonymously with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to sign in anonymously");
      }

      this.currentUser = authData.user;

      // Create user profile in Supabase
      const userProfile: SupabaseUserInsert = {
        id: authData.user.id,
        nickname: userData.nickname,
        gender: userData.gender,
        age: userData.age,
        country: userData.country,
        role: "standard",
        status: "active",
        online: true,
        avatar: `/avatars/standard/${userData.gender}.png`,
      };

      // Save to users table
      const { error: profileError } = await supabase
        .from("users")
        .insert([userProfile]);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Set up presence
      await presenceService.setUserOnline({
        id: authData.user.id,
        nickname: userData.nickname,
        gender: userData.gender,
        age: userData.age,
        country: userData.country,
        role: "standard",
        status: "active",
        createdAt: new Date().toISOString(),
        online: true,
        avatar: `/avatars/standard/${userData.gender}.png`,
      });

      // Return user in expected format
      return {
        id: authData.user.id,
        nickname: userData.nickname,
        gender: userData.gender,
        age: userData.age,
        country: userData.country,
        role: "standard",
        status: "active",
        createdAt: new Date().toISOString(),
        online: true,
        avatar: `/avatars/standard/${userData.gender}.png`,
      };
    } catch (error) {
      logger.error("Error signing in:", error);
      throw new Error("Failed to sign in. Please try again.");
    }
  }

  // Retry helper for network requests
  private async retryRequest<T>(
    request: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await request();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('Invalid JWT') || 
            error.message?.includes('session_not_found') ||
            error.status === 401) {
          throw error;
        }
        
        // Log retry attempt
        if (i < maxRetries) {
          logger.warn(`Request failed, retrying... (${i + 1}/${maxRetries})`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Get current user profile with enhanced error handling for 403 errors
  async getCurrentUser(): Promise<User | null> {
    try {
      // Check session validity first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        logger.warn("No valid session found, user needs to re-authenticate");
        this.currentUser = null;
        return null;
      }

      // Try to get user data
      let userData;
      try {
        userData = await connectionService.executeWithRetry(
          () => supabase.auth.getUser()
        );
      } catch (connectionError: any) {
        // Check for 403 Forbidden error
        if (connectionError.message?.includes('403') ||
            connectionError.status === 403 ||
            connectionError.message?.includes('Forbidden')) {
          logger.warn("403 Forbidden error - token expired, clearing session");
          this.currentUser = null;
          return null;
        }
        logger.warn("Connection service failed, using basic retry:", connectionError);
        userData = await this.retryRequest(() => supabase.auth.getUser());
      }

      const { data: { user } } = userData;
      if (!user) {
        this.currentUser = null;
        return null;
      }

      this.currentUser = user;

      // Get user profile from database with 403 error handling
      let userProfile;
      try {
        const result = await connectionService.executeWithRetry(
          () => supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()
        );
        userProfile = result;
      } catch (connectionError: any) {
        // Check for 403/406 errors
        if (connectionError.message?.includes('403') ||
            connectionError.message?.includes('406') ||
            connectionError.status === 403 ||
            connectionError.status === 406) {
          logger.warn("Database access forbidden - session expired, clearing user");
          this.currentUser = null;
          return null;
        }
        logger.warn("Connection service failed for profile, using basic retry:", connectionError);
        userProfile = await this.retryRequest(
          () => supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()
        );
      }

      const { data: profile, error } = userProfile;

      if (error) {
        // Check for auth-related errors
        if (error.message?.includes('403') ||
            error.message?.includes('406') ||
            error.message?.includes('Forbidden') ||
            error.message?.includes('Not Acceptable')) {
          logger.warn("Database query failed with auth error, clearing session:", error.message);
          this.currentUser = null;
          return null;
        }
        logger.warn("User profile not found or error:", error);
        return null;
      }

      if (!profile) {
        logger.warn("User profile not found");
        return null;
      }

      // Check if user is kicked or banned - auto sign out if so
      if (profile.status === 'kicked' || profile.status === 'banned') {
        logger.debug(`User is ${profile.status}, signing out automatically`);
        await this.signOut();
        return null;
      }

      // Convert Supabase user format to app format
      return this.convertSupabaseUser(profile);
    } catch (error: any) {
      logger.error("Error getting current user:", error);

      // Enhanced error handling for auth errors
      if (error.message?.includes('403') ||
          error.message?.includes('406') ||
          error.message?.includes('Forbidden') ||
          error.message?.includes('Not Acceptable') ||
          error.status === 403 ||
          error.status === 406) {
        logger.warn("Authentication error detected, clearing session");
        this.currentUser = null;
        return null;
      }

      // Graceful error handling for network issues
      if (error.message?.includes('Failed to fetch') ||
          error.message?.includes('CORS') ||
          error.message?.includes('502')) {
        logger.warn("Network connectivity issue. Session may be stale.");
        this.currentUser = null;
      }

      return null;
    }
  }

  // Sign out
  async signOut() {
    if (this.currentUser) {
      try {
        // Check if session is still valid before making database queries
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (!sessionError && sessionData.session) {
          // Session is valid, proceed with role-based cleanup
          try {
            // Get current user profile to check role
            const { data: userProfile } = await supabase
              .from("users")
              .select("role")
              .eq("id", this.currentUser.id)
              .single();

            if (userProfile) {
              // Use enhanced cleanup that handles VIP/Admin differently
              const { enhancedCleanupService } = await import('./enhancedCleanupService');
              await enhancedCleanupService.handleLogout({
                id: this.currentUser.id,
                role: userProfile.role
              } as User);
            } else {
              // Fallback to basic offline setting
              await presenceService.setUserOffline(this.currentUser.id);
            }
          } catch (dbError) {
            logger.warn("Error during database cleanup, using basic offline:", dbError);
            // Database query failed, use basic cleanup
            await presenceService.setUserOffline(this.currentUser.id);
          }
        } else {
          // Session is invalid, skip database operations and use basic cleanup
          logger.warn("Session invalid during signout, using basic cleanup");
          await presenceService.setUserOffline(this.currentUser.id);
        }
      } catch (error) {
        logger.warn("Error during logout cleanup:", error);
        // Continue with logout even if cleanup fails
        try {
          await presenceService.setUserOffline(this.currentUser.id);
        } catch (presenceError) {
          logger.warn("Error setting user offline:", presenceError);
          // Even presence cleanup failed, continue with auth signout
        }
      }
    }

    // Clear current user reference before auth signout
    const wasAuthenticated = !!this.currentUser;
    this.currentUser = null;

    // Sign out from Supabase auth only if we have a valid session
    if (wasAuthenticated) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          await supabase.auth.signOut();
        } else {
          logger.debug("No valid session to sign out from");
        }
      } catch (error) {
        logger.warn("Error during auth signout:", error);
        // Even if auth signout fails, we've cleared the local state
      }
    }
  }

  // Listen to auth state
  onAuthStateChange(callback: (user: any | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  // Convert Supabase user format to app format
  private convertSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      nickname: supabaseUser.nickname,
      role: supabaseUser.role,
      gender: supabaseUser.gender,
      age: supabaseUser.age,
      country: supabaseUser.country,
      avatar: supabaseUser.avatar,
      createdAt: supabaseUser.created_at,
      status: supabaseUser.status,
      lastSeen: supabaseUser.last_seen ? Date.parse(supabaseUser.last_seen) : undefined,
      online: supabaseUser.online,
      vipExpiresAt: supabaseUser.vip_expires_at,
    };
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    return this.currentUser?.id || null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

export const authService = new AuthService();