import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiSearch, FiFilter, FiDownload, FiUser, FiShield, FiFlag, FiSettings } from "solid-icons/fi";

interface AuditLogsProps {
  currentUserId: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminNickname: string;
  action: string;
  target: string;
  targetId: string;
  details: string;
  ipAddress: string;
  category: "user_management" | "reports" | "settings" | "security";
  severity: "low" | "medium" | "high";
}

const AuditLogs: Component<AuditLogsProps> = (props) => {
  const [logs, setLogs] = createSignal<AuditLogEntry[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      adminId: props.currentUserId,
      adminNickname: "Current Admin",
      action: "User Suspended",
      target: "spammer123",
      targetId: "user_123",
      details: "User suspended for violating community guidelines - spam reports",
      ipAddress: "192.168.1.100",
      category: "user_management",
      severity: "medium"
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      adminId: "admin_456",
      adminNickname: "Admin User",
      action: "Report Resolved",
      target: "Report #1234",
      targetId: "report_1234",
      details: "Report against user john_doe resolved as valid - user warned",
      ipAddress: "192.168.1.101",
      category: "reports",
      severity: "low"
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      adminId: props.currentUserId,
      adminNickname: "Current Admin",
      action: "VIP Granted",
      target: "premium_user",
      targetId: "user_789",
      details: "User upgraded to VIP status - 30 day subscription",
      ipAddress: "192.168.1.100",
      category: "user_management",
      severity: "low"
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      adminId: "admin_456",
      adminNickname: "Admin User",
      action: "Settings Updated",
      target: "Site Configuration",
      targetId: "settings_global",
      details: "Maximum concurrent users changed from 500 to 1000",
      ipAddress: "192.168.1.101",
      category: "settings",
      severity: "medium"
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      adminId: props.currentUserId,
      adminNickname: "Current Admin",
      action: "User Deleted",
      target: "deleted_user",
      targetId: "user_000",
      details: "User account permanently deleted - multiple policy violations",
      ipAddress: "192.168.1.100",
      category: "user_management",
      severity: "high"
    }
  ]);
  const [loading, setLoading] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal("");
  const [categoryFilter, setCategoryFilter] = createSignal<string>("");
  const [severityFilter, setSeverityFilter] = createSignal<string>("");
  const [showFilters, setShowFilters] = createSignal(false);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [total, setTotal] = createSignal(5);

  const pageSize = 20;

  onMount(() => {
    // In a real app, fetch audit logs from the backend
    setLoading(false);
  });

  const filteredLogs = () => {
    return logs().filter(log => {
      const matchesSearch = searchTerm() === "" || 
        log.adminNickname.toLowerCase().includes(searchTerm().toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm().toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm().toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm().toLowerCase());
      
      const matchesCategory = categoryFilter() === "" || log.category === categoryFilter();
      const matchesSeverity = severityFilter() === "" || log.severity === severityFilter();
      
      return matchesSearch && matchesCategory && matchesSeverity;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "user_management":
        return FiUser;
      case "reports":
        return FiFlag;
      case "settings":
        return FiSettings;
      case "security":
        return FiShield;
      default:
        return FiUser;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "user_management":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30";
      case "reports":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "settings":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30";
      case "security":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "low":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const exportLogs = () => {
    const csvContent = [
      "Timestamp,Admin,Action,Target,Details,IP Address,Category,Severity",
      ...filteredLogs().map(log => 
        `"${log.timestamp}","${log.adminNickname}","${log.action}","${log.target}","${log.details}","${log.ipAddress}","${log.category}","${log.severity}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalPages = () => Math.ceil(filteredLogs().length / pageSize);
  const paginatedLogs = () => {
    const start = (currentPage() - 1) * pageSize;
    return filteredLogs().slice(start, start + pageSize);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            System Audit Logs
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track all administrative actions and system events
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex gap-2">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            {filteredLogs().length} entries
          </span>
          <button
            onClick={exportLogs}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiDownload size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div class="flex-1">
            <div class="relative">
              <FiSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search logs by admin, action, target, or details..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters())}
            class="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FiFilter size={18} />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        <Show when={showFilters()}>
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter()}
                  onChange={(e) => setCategoryFilter(e.currentTarget.value)}
                  class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  <option value="user_management">User Management</option>
                  <option value="reports">Reports</option>
                  <option value="settings">Settings</option>
                  <option value="security">Security</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter()}
                  onChange={(e) => setSeverityFilter(e.currentTarget.value)}
                  class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Logs Table */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <Show when={loading()}>
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading audit logs...
                  </td>
                </tr>
              </Show>
              <Show when={!loading() && paginatedLogs().length === 0}>
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No audit logs found matching your criteria
                  </td>
                </tr>
              </Show>
              <For each={paginatedLogs()}>
                {(log) => {
                  const dateTime = formatDate(log.timestamp);
                  const IconComponent = getCategoryIcon(log.category);
                  
                  return (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td class="px-6 py-4">
                        <div class="flex flex-col">
                          <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {dateTime.date}
                          </span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            {dateTime.time}
                          </span>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <FiShield class="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                              {log.adminNickname}
                            </span>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {log.ipAddress}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div>
                          <span class="text-sm text-gray-900 dark:text-white">
                            {log.target}
                          </span>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                            {log.details}
                          </p>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span class={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(log.category)}`}>
                          <IconComponent size={12} />
                          {log.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage() - 1) * pageSize) + 1} to {Math.min(currentPage() * pageSize, filteredLogs().length)} of {filteredLogs().length} entries
              </div>
              <div class="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage() - 1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage() + 1)}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default AuditLogs;