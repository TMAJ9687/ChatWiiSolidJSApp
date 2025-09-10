import { createSignal, createEffect, onMount } from "solid-js";
import { cleanupService, type CleanupStats, type CleanupResult, type CleanupLog } from "../../services/supabase/cleanupService";
import { manualCleanupService } from "../../services/supabase/manualCleanupService";

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
  const [enhancedCleanupResult, setEnhancedCleanupResult] = createSignal<string>('');
  const [manualCleanupLogs, setManualCleanupLogs] = createSignal<string[]>([]);
  const [userStats, setUserStats] = createSignal<any>(null);
  const [cleanupInProgress, setCleanupInProgress] = createSignal<boolean>(false);

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

  // Enhanced cleanup test functions
  const testEnhancedCleanup = async () => {
    try {
      setIsLoading(true);
      const { enhancedCleanupService } = await import('../../services/supabase/enhancedCleanupService');
      const result = await enhancedCleanupService.cleanupStaleStandardUsers();
      setEnhancedCleanupResult(`Enhanced cleanup completed: ${result} stale standard users removed`);
      setMessage({ 
        type: 'success', 
        text: `Enhanced cleanup test completed: ${result} users processed` 
      });
      await loadData();
    } catch (error) {
      setEnhancedCleanupResult(`Enhanced cleanup failed: ${error.message || 'Unknown error'}`);
      setMessage({ type: 'error', text: 'Enhanced cleanup test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual cleanup functions
  const loadUserStats = async () => {
    try {
      const stats = await manualCleanupService.getAllUsers();
      setUserStats(stats);
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load user stats: ${error.message}` });
    }
  };

  const runTestCleanup = async () => {
    try {
      setIsLoading(true);
      const logs = await manualCleanupService.testCleanup();
      setManualCleanupLogs(logs);
      await loadUserStats();
      setMessage({ type: 'info', text: 'Cleanup test completed - check logs below' });
    } catch (error) {
      setMessage({ type: 'error', text: `Test cleanup failed: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const runManualCleanup = async () => {
    if (!confirm('Are you sure you want to clean up offline standard users? This will permanently delete their data!')) {
      return;
    }

    try {
      setCleanupInProgress(true);
      setIsLoading(true);
      const result = await manualCleanupService.cleanupOfflineStandardUsers();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `${result.message} - ${result.deletedCount} users deleted` 
        });
        setManualCleanupLogs(result.details);
      } else {
        setMessage({ type: 'error', text: result.message });
        setManualCleanupLogs(result.details);
      }
      
      await loadUserStats();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: `Manual cleanup failed: ${error.message}` });
    } finally {
      setCleanupInProgress(false);
      setIsLoading(false);
    }
  };

  const forceUsersOffline = async () => {
    if (!confirm('Force all standard users offline? This will immediately disconnect all standard users.')) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await manualCleanupService.forceAllStandardUsersOffline();
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      await loadUserStats();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to force users offline: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllPresence = async () => {
    if (!confirm('Clear ALL presence records? This is a nuclear option that will clear the entire presence table!')) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await manualCleanupService.clearAllPresence();
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      await loadUserStats();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to clear presence: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Manual Cleanup Control Panel */}
      <div class="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 class="text-lg font-medium mb-4 text-red-900">🔧 Manual Cleanup Control Panel</h3>
        <p class="text-sm text-red-700 mb-4">
          Direct database cleanup tools with detailed logging. Use these tools to manually clean up users and test the cleanup system.
        </p>
        
        {/* User Statistics */}
        <div class="mb-6">
          <button
            onClick={loadUserStats}
            disabled={isLoading()}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            Load User Statistics
          </button>
          
          {userStats() && (
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div class="bg-gray-100 p-3 rounded">
                <h4 class="text-sm font-medium text-gray-700">Total Users</h4>
                <p class="text-xl font-bold text-gray-900">{userStats().totalUsers}</p>
              </div>
              <div class="bg-green-100 p-3 rounded">
                <h4 class="text-sm font-medium text-green-700">Online</h4>
                <p class="text-xl font-bold text-green-800">{userStats().onlineUsers}</p>
              </div>
              <div class="bg-blue-100 p-3 rounded">
                <h4 class="text-sm font-medium text-blue-700">Standard</h4>
                <p class="text-xl font-bold text-blue-800">{userStats().standardUsers}</p>
              </div>
              <div class="bg-purple-100 p-3 rounded">
                <h4 class="text-sm font-medium text-purple-700">VIP</h4>
                <p class="text-xl font-bold text-purple-800">{userStats().vipUsers}</p>
              </div>
              <div class="bg-yellow-100 p-3 rounded">
                <h4 class="text-sm font-medium text-yellow-700">Admin</h4>
                <p class="text-xl font-bold text-yellow-800">{userStats().adminUsers}</p>
              </div>
            </div>
          )}
        </div>

        {/* Manual Cleanup Actions */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="space-y-2">
            <button
              onClick={runTestCleanup}
              disabled={isLoading()}
              class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              🔍 Test Cleanup (Safe)
            </button>
            <p class="text-xs text-gray-600">Analyze what would be cleaned up without making changes</p>
          </div>

          <div class="space-y-2">
            <button
              onClick={runManualCleanup}
              disabled={isLoading() || cleanupInProgress()}
              class="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {cleanupInProgress() ? '🔄 Cleaning...' : '🗑️ Clean Offline Standard Users'}
            </button>
            <p class="text-xs text-gray-600">Permanently delete offline standard users and their data</p>
          </div>

          <div class="space-y-2">
            <button
              onClick={forceUsersOffline}
              disabled={isLoading()}
              class="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              ⚡ Force Standard Users Offline
            </button>
            <p class="text-xs text-gray-600">Immediately disconnect all standard users (keeps accounts)</p>
          </div>

          <div class="space-y-2">
            <button
              onClick={clearAllPresence}
              disabled={isLoading()}
              class="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
            >
              💥 Clear All Presence (Nuclear)
            </button>
            <p class="text-xs text-gray-600">Clear entire presence table - use only in emergencies</p>
          </div>
        </div>

        {/* Cleanup Logs */}
        {manualCleanupLogs().length > 0 && (
          <div class="mt-6 bg-gray-50 border border-gray-200 rounded p-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Cleanup Logs:</h4>
            <div class="text-xs font-mono text-gray-700 max-h-64 overflow-y-auto premium-scrollbar">
              {manualCleanupLogs().map((log, index) => (
                <div key={index} class={`py-1 ${
                  log.includes('❌') ? 'text-red-600' :
                  log.includes('✅') || log.includes('✓') ? 'text-green-600' :
                  log.includes('Warning') ? 'text-yellow-600' :
                  'text-gray-700'
                }`}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Cleanup Testing Section */}
      <div class="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 class="text-lg font-medium mb-4 text-purple-900">Enhanced Cleanup System (Real-time)</h3>
        <p class="text-sm text-purple-700 mb-4">
          Test the new enhanced cleanup system that provides immediate cleanup for standard users when they disconnect,
          while preserving VIP and Admin accounts.
        </p>
        
        <div class="flex gap-4 mb-4">
          <button
            onClick={testEnhancedCleanup}
            disabled={isLoading()}
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Test Enhanced Cleanup
          </button>
        </div>

        {enhancedCleanupResult() && (
          <div class="mt-4 p-3 bg-purple-100 border border-purple-300 rounded">
            <p class="text-sm text-purple-800">{enhancedCleanupResult()}</p>
          </div>
        )}

        <div class="mt-4 text-xs text-purple-600">
          <strong>Enhanced Cleanup Features:</strong>
          <ul class="list-disc list-inside ml-4 mt-1">
            <li>Immediate cleanup on browser close/refresh for standard users</li>
            <li>Complete removal from auth and database tables</li>
            <li>VIP and Admin accounts preserved - only marked offline</li>
            <li>Automatic cleanup of stale connections every 2 minutes</li>
            <li>Browser event handlers for reliable cleanup</li>
          </ul>
        </div>
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
              This includes all their messages, reports, blocks, and presence data. Admin and VIP users are preserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}