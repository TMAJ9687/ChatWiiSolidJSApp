import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { FiUsers, FiActivity, FiFlag, FiTrendingUp, FiMessageSquare } from "solid-icons/fi";
import { adminService } from "../../services/supabase/adminService";

interface DashboardProps {
  currentUserId: string;
  currentUserNickname: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalReports: number;
  pendingReports: number;
  blockedUsers: number;
  totalFeedback: number;
  unreadFeedback: number;
}

interface ActivityItem {
  id: string;
  type: "user_registered" | "report_submitted" | "user_upgraded" | "user_suspended";
  message: string;
  timestamp: string;
  priority: "low" | "medium" | "high";
}

const Dashboard: Component<DashboardProps> = (props) => {
  const [stats, setStats] = createSignal<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    blockedUsers: 0,
    totalFeedback: 0,
    unreadFeedback: 0,
  });

  const [recentActivity, setRecentActivity] = createSignal<ActivityItem[]>([
    {
      id: "1",
      type: "user_registered",
      message: "New user registered: john_doe",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      priority: "low"
    },
    {
      id: "2", 
      type: "report_submitted",
      message: "Report submitted against user: spammer123",
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      priority: "high"
    },
    {
      id: "3",
      type: "user_upgraded",
      message: "User upgraded to VIP: premium_user",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      priority: "medium"
    }
  ]);

  const [loading, setLoading] = createSignal(true);
  let statsInterval: NodeJS.Timeout | undefined;

  onMount(() => {
    loadStats();
    // Refresh stats every 30 seconds
    statsInterval = setInterval(loadStats, 30000);
  });

  onCleanup(() => {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  });

  const loadStats = async () => {
    try {
      const adminStats = await adminService.getAdminStats();
      setStats(adminStats);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_registered":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
      case "report_submitted":
        return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
      case "user_upgraded":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
      case "user_suspended":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour${Math.floor(diff / 3600000) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400000)} day${Math.floor(diff / 86400000) > 1 ? 's' : ''} ago`;
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div class="space-y-6">
      {/* Welcome Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {props.currentUserNickname}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center gap-2">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Administrator
          </span>
          <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Live Data
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Users
              </p>
              <div class="flex items-baseline gap-2 mt-2">
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading() ? "..." : stats().totalUsers.toLocaleString()}
                </p>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <FiTrendingUp class="w-3 h-3 mr-1" />
                  +12%
                </span>
              </div>
            </div>
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FiUsers class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Online Users */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Online Now
              </p>
              <div class="flex items-baseline gap-2 mt-2">
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading() ? "..." : stats().onlineUsers}
                </p>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {loading() ? "" : `${Math.round((stats().onlineUsers / stats().totalUsers) * 100)}% active`}
                </span>
              </div>
            </div>
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <div class="w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Pending Reports */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pending Reports
              </p>
              <div class="flex items-baseline gap-2 mt-2">
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading() ? "..." : stats().pendingReports}
                </p>
                {stats().pendingReports > 0 && (
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    Attention Required
                  </span>
                )}
              </div>
            </div>
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <FiFlag class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* User Feedback */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                User Feedback
              </p>
              <div class="flex items-baseline gap-2 mt-2">
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading() ? "..." : stats().unreadFeedback}
                </p>
                {stats().unreadFeedback > 0 && (
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    New
                  </span>
                )}
              </div>
            </div>
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FiMessageSquare class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Users
              </p>
              <div class="flex items-baseline gap-2 mt-2">
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading() ? "..." : stats().activeUsers.toLocaleString()}
                </p>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {loading() ? "" : `${Math.round((stats().activeUsers / stats().totalUsers) * 100)}% of total`}
                </span>
              </div>
            </div>
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FiActivity class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div class="space-y-3">
              <button class="w-full p-4 text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium text-blue-900 dark:text-blue-300">
                      Manage Users
                    </h3>
                    <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      View, suspend, or modify user accounts
                    </p>
                  </div>
                  <FiUsers class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </button>

              <button class="w-full p-4 text-left bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium text-yellow-900 dark:text-yellow-300">
                      Review Reports
                    </h3>
                    <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      {stats().pendingReports} pending reports need attention
                    </p>
                  </div>
                  <div class="relative">
                    <FiFlag class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    {stats().pendingReports > 0 && (
                      <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {stats().pendingReports > 9 ? "9+" : stats().pendingReports}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button class="w-full p-4 text-left bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium text-purple-900 dark:text-purple-300">
                      Site Settings
                    </h3>
                    <p class="text-sm text-purple-700 dark:text-purple-400 mt-1">
                      Configure global site options
                    </p>
                  </div>
                  <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <button class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                View All
              </button>
            </div>
            <div class="space-y-4">
              {recentActivity().map((activity) => (
                <div class="flex items-start gap-3">
                  <div class={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityIcon(activity.type)}`}>
                    <div class="w-2 h-2 bg-current rounded-full"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Health
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Database</p>
                <p class="text-xs text-green-600 dark:text-green-400">Operational</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Real-time</p>
                <p class="text-xs text-green-600 dark:text-green-400">Connected</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Storage</p>
                <p class="text-xs text-green-600 dark:text-green-400">Available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;