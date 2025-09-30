import { Component, createSignal, Show } from "solid-js";
import { supabase } from "../../config/supabase";

interface CleanupResult {
  success: boolean;
  message: string;
  users_cleared?: number;
  total_before?: number;
  stats?: any;
}

const PresenceCleanup: Component = () => {
  const [isLoading, setIsLoading] = createSignal(false);
  const [result, setResult] = createSignal<CleanupResult | null>(null);
  const [stats, setStats] = createSignal<any>(null);

  const getStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_presence_debug_stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error getting stats:', error);
      setResult({
        success: false,
        message: `Error getting stats: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emergencyCleanup = async () => {
    if (!confirm('This will mark ALL users as offline. Are you sure?')) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('emergency_clear_all_presence');
      if (error) throw error;
      setResult(data);
      // Refresh stats
      await getStats();
    } catch (error) {
      console.error('Error in emergency cleanup:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnonymous = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('clear_anonymous_users');
      if (error) throw error;
      setResult(data);
      // Refresh stats
      await getStats();
    } catch (error) {
      console.error('Error clearing anonymous users:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forceCleanup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('force_presence_cleanup_detailed');
      if (error) throw error;
      setResult(data);
      // Refresh stats
      await getStats();
    } catch (error) {
      console.error('Error in force cleanup:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetSystem = async () => {
    if (!confirm('This will COMPLETELY RESET the presence system. Are you absolutely sure?')) return;
    if (!confirm('This is irreversible. All presence data will be lost. Continue?')) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_presence_system');
      if (error) throw error;
      setResult(data);
      // Refresh stats
      await getStats();
    } catch (error) {
      console.error('Error resetting system:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial stats
  getStats();

  return (
    <div class="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4 text-text-900 dark:text-text-100">
        Presence System Cleanup
      </h2>

      {/* Stats Display */}
      <Show when={stats()}>
        <div class="mb-6 p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
          <h3 class="font-semibold mb-2 text-text-900 dark:text-text-100">Current Stats</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div class="font-medium text-text-700 dark:text-text-300">Online Users</div>
              <div class="text-lg font-bold text-green-600">{stats()?.online_users || 0}</div>
            </div>
            <div>
              <div class="font-medium text-text-700 dark:text-text-300">Stale (2min)</div>
              <div class="text-lg font-bold text-red-600">{stats()?.stale_users_2min || 0}</div>
            </div>
            <div>
              <div class="font-medium text-text-700 dark:text-text-300">Stale (1hr)</div>
              <div class="text-lg font-bold text-red-600">{stats()?.stale_users_1hour || 0}</div>
            </div>
            <div>
              <div class="font-medium text-text-700 dark:text-text-300">No Heartbeat</div>
              <div class="text-lg font-bold text-orange-600">{stats()?.users_without_heartbeat || 0}</div>
            </div>
          </div>
        </div>
      </Show>

      {/* Action Buttons */}
      <div class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <button
            onClick={getStats}
            disabled={isLoading()}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading() ? 'Loading...' : 'Refresh Stats'}
          </button>

          <button
            onClick={forceCleanup}
            disabled={isLoading()}
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Force Cleanup (Safe)
          </button>

          <button
            onClick={clearAnonymous}
            disabled={isLoading()}
            class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Clear Anonymous Users
          </button>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            onClick={emergencyCleanup}
            disabled={isLoading()}
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            🚨 Emergency: Clear ALL Users
          </button>

          <button
            onClick={resetSystem}
            disabled={isLoading()}
            class="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900 disabled:opacity-50"
          >
            ☢️ NUCLEAR: Reset System
          </button>
        </div>
      </div>

      {/* Result Display */}
      <Show when={result()}>
        <div class={`mt-4 p-4 rounded-lg ${
          result()?.success 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
            : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          <div class="font-semibold">
            {result()?.success ? '✅ Success' : '❌ Error'}
          </div>
          <div class="mt-1">{result()?.message}</div>
          <Show when={result()?.users_cleared !== undefined}>
            <div class="mt-2 text-sm">
              Users cleared: {result()?.users_cleared} 
              {result()?.total_before && ` (out of ${result()?.total_before})`}
            </div>
          </Show>
        </div>
      </Show>

      {/* Instructions */}
      <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Instructions</h4>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li><strong>Force Cleanup:</strong> Removes users inactive for 2+ minutes (safe)</li>
          <li><strong>Clear Anonymous:</strong> Removes guest/anonymous users only</li>
          <li><strong>Emergency Clear:</strong> Marks ALL users as offline immediately</li>
          <li><strong>Nuclear Reset:</strong> Completely resets the presence system</li>
        </ul>
      </div>
    </div>
  );
};

export default PresenceCleanup;