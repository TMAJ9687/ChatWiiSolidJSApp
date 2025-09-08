import { createSignal, createEffect, onMount } from "solid-js";
import { cleanupService, type CleanupStats, type CleanupResult, type CleanupLog } from "../../services/supabase/cleanupService";

export function CleanupPanel() {
  const [stats, setStats] = createSignal<CleanupStats>({
    totalAnonymousUsers: 0,
    activeAnonymousUsers: 0,
    inactiveFor1HPlus: 0,
    readyForCleanup: 0
  });
  const [recentLogs, setRecentLogs] = createSignal<CleanupLog[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [lastAction, setLastAction] = createSignal<CleanupResult | null>(null);
  const [isAutomaticActive, setIsAutomaticActive] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Load initial data
  onMount(() => {
    loadData();
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const summary = await cleanupService.getCleanupSummary();
      setStats(summary.stats);
      setRecentLogs(summary.recentActivity);
      setIsAutomaticActive(summary.isAutomaticActive);
    } catch (error) {
      console.error('Error loading cleanup data:', error);
      setMessage({ type: 'error', text: 'Failed to load cleanup data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDryRun = async () => {
    try {
      setIsLoading(true);
      const result = await cleanupService.dryRunCleanup();
      setLastAction(result);
      setMessage({ 
        type: 'info', 
        text: `Dry run complete: ${result.count} users would be deleted` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to run dry run cleanup' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCleanup = async () => {
    if (!confirm('Are you sure you want to delete inactive anonymous users? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      const { success, result, error } = await cleanupService.manualCleanup();
      
      if (success) {
        setLastAction(result);
        setMessage({ 
          type: 'success', 
          text: `Cleanup completed: ${result.count} users deleted` 
        });
        // Reload data to reflect changes
        await loadData();
      } else {
        setMessage({ type: 'error', text: error || 'Cleanup failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to execute cleanup' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomaticCleanup = async () => {
    try {
      setIsLoading(true);
      const result = isAutomaticActive() 
        ? await cleanupService.disableAutomaticCleanup()
        : await cleanupService.enableAutomaticCleanup();
      
      if (result.success) {
        setIsAutomaticActive(!isAutomaticActive());
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle automatic cleanup' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const clearMessage = () => setMessage(null);

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Anonymous User Cleanup</h2>
        <button
          onClick={loadData}
          disabled={isLoading()}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading() ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Message Display */}
      {message() && (
        <div class={`mb-4 p-3 rounded-md flex items-center justify-between ${
          message()!.type === 'success' ? 'bg-green-100 text-green-800' :
          message()!.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          <span>{message()!.text}</span>
          <button
            onClick={clearMessage}
            class="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-gray-500">Total Anonymous</h3>
          <p class="text-2xl font-bold text-gray-900">{stats().totalAnonymousUsers}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-green-600">Currently Active</h3>
          <p class="text-2xl font-bold text-green-700">{stats().activeAnonymousUsers}</p>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-yellow-600">Inactive 1h+</h3>
          <p class="text-2xl font-bold text-yellow-700">{stats().inactiveFor1HPlus}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-red-600">Ready for Cleanup</h3>
          <p class="text-2xl font-bold text-red-700">{stats().readyForCleanup}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div class="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 class="text-lg font-medium mb-4">Cleanup Controls</h3>
        
        {/* Automatic Cleanup Toggle */}
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="font-medium">Automatic Cleanup</h4>
            <p class="text-sm text-gray-600">
              {isAutomaticActive() ? 'Enabled - runs every hour' : 'Disabled - manual cleanup only'}
            </p>
          </div>
          <button
            onClick={toggleAutomaticCleanup}
            disabled={isLoading()}
            class={`px-4 py-2 rounded font-medium ${
              isAutomaticActive() 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {isAutomaticActive() ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Manual Controls */}
        <div class="flex gap-4">
          <button
            onClick={handleDryRun}
            disabled={isLoading()}
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Dry Run (Safe)
          </button>
          <button
            onClick={handleManualCleanup}
            disabled={isLoading() || stats().readyForCleanup === 0}
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Execute Cleanup ({stats().readyForCleanup} users)
          </button>
        </div>
        
        <p class="text-xs text-gray-500 mt-2">
          Dry Run shows what would be deleted without actually doing it. Execute Cleanup permanently deletes inactive anonymous users.
        </p>
      </div>

      {/* Last Action Result */}
      {lastAction() && (
        <div class="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 class="text-lg font-medium mb-2">Last Action Result</h3>
          <div class="space-y-1 text-sm">
            <p><strong>Action:</strong> {lastAction()!.action}</p>
            <p><strong>Count:</strong> {lastAction()!.count}</p>
            <p><strong>Details:</strong> {lastAction()!.details}</p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h3 class="text-lg font-medium mb-4">Recent Cleanup Activity</h3>
        {recentLogs().length === 0 ? (
          <p class="text-gray-500 text-sm">No cleanup activity recorded</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users Affected
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {recentLogs().map((log) => (
                  <tr key={log.id}>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.executedAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.operation}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.usersAffected}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700">
              <strong>How it works:</strong> Anonymous users who haven't been active for more than 1 hour are automatically cleaned up to reduce database costs. 
              This includes all their messages, reports, blocks, and presence data. Admin users are never affected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}