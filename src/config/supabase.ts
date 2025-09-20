import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-timeout': '30000' // 30 second timeout
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    }
  }
})

// EMERGENCY OVERRIDE: Prevent 403 spam by intercepting getUser calls
const originalGetUser = supabase.auth.getUser;
let lastGetUserCall = 0;
let consecutiveFailures = 0;
const THROTTLE_MS = 1000; // 1 second between calls
const MAX_FAILURES = 3;

supabase.auth.getUser = async function() {
  const now = Date.now();

  // Throttle calls to prevent spam
  if (now - lastGetUserCall < THROTTLE_MS) {
    return { data: { user: null }, error: new Error('Throttled to prevent spam') };
  }

  // Circuit breaker: if too many failures, stop trying
  if (consecutiveFailures >= MAX_FAILURES) {
    return { data: { user: null }, error: new Error('Circuit breaker: too many failures') };
  }

  lastGetUserCall = now;

  try {
    const result = await originalGetUser.call(this);

    if (result.error) {
      consecutiveFailures++;
      // If 403 error, don't retry
      if (result.error.message?.includes('403') ||
          result.error.message?.includes('Forbidden') ||
          result.error.status === 403) {
        consecutiveFailures = MAX_FAILURES; // Stop further attempts
      }
    } else {
      consecutiveFailures = 0; // Reset on success
    }

    return result;
  } catch (error: any) {
    consecutiveFailures++;
    if (error.message?.includes('403') ||
        error.message?.includes('Forbidden') ||
        error.status === 403) {
      consecutiveFailures = MAX_FAILURES; // Stop further attempts
    }
    return { data: { user: null }, error };
  }
};

export default supabase