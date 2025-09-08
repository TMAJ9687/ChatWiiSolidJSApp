import { Component, createSignal, onMount } from "solid-js";
import { FiUsers, FiFlag, FiSettings, FiActivity, FiMenu, FiX, FiFileText, FiMessageSquare, FiTrash2 } from "solid-icons/fi";
import { adminService } from "../../services/supabase/adminService";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUserId: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalReports: number;
  pendingReports: number;
  blockedUsers: number;
  totalFeedback: number;
  unreadFeedback: number;
}

const AdminSidebar: Component<AdminSidebarProps> = (props) => {
  const [stats, setStats] = createSignal<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    blockedUsers: 0,
    totalFeedback: 0,
    unreadFeedback: 0,
  });
  const [isMobileOpen, setIsMobileOpen] = createSignal(false);

  onMount(async () => {
    const adminStats = await adminService.getAdminStats();
    setStats(adminStats);
  });

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: FiActivity,
      count: undefined,
    },
    {
      id: "users",
      label: "User Management",
      icon: FiUsers,
      count: stats().totalUsers,
    },
    {
      id: "reports",
      label: "Reports",
      icon: FiFlag,
      count: stats().pendingReports,
    },
    {
      id: "feedback",
      label: "User Feedback",
      icon: FiMessageSquare,
      count: stats().unreadFeedback,
    },
    {
      id: "cleanup",
      label: "User Cleanup",
      icon: FiTrash2,
      count: undefined,
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: FiFileText,
      count: undefined,
    },
    {
      id: "settings",
      label: "Site Settings",
      icon: FiSettings,
      count: undefined,
    },
  ];

  const handleTabChange = (tabId: string) => {
    props.onTabChange(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div class="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen())}
          class="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          {isMobileOpen() ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* Overlay for mobile */}
      <div
        class={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200 ${
          isMobileOpen() ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar */}
      <div
        class={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-200 md:transform-none ${
          isMobileOpen() ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div class="flex flex-col h-full">
          {/* Header */}
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Admin Panel
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              System Management
            </p>
          </div>

          {/* Stats Overview */}
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Online Users
                </p>
                <p class="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {stats().onlineUsers}
                </p>
              </div>
              <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p class="text-xs text-green-600 dark:text-green-400 font-medium">
                  Total Users
                </p>
                <p class="text-lg font-bold text-green-700 dark:text-green-300">
                  {stats().totalUsers}
                </p>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <p class="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Pending Reports
                </p>
                <p class="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {stats().pendingReports}
                </p>
              </div>
              <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Active Users
                </p>
                <p class="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {stats().activeUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div class="flex-1 p-2">
            <nav class="space-y-1">
              {menuItems.map((item) => (
                <button
                  onClick={() => handleTabChange(item.id)}
                  class={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    props.activeTab === item.id
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div class="flex items-center">
                    <item.icon size={18} class="mr-3" />
                    <span class="font-medium">{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      class={`px-2 py-1 rounded-full text-xs font-medium ${
                        props.activeTab === item.id
                          ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.count > 99 ? "99+" : item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div class="p-4 border-t border-gray-200 dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              ChatWii Admin Dashboard
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;