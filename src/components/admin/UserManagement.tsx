import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiSearch, FiFilter, FiMoreVertical, FiUser, FiShield, FiTrash2, FiEye } from "solid-icons/fi";
import { adminService } from "../../services/supabase/adminService";
import CountryFlag from "../shared/CountryFlag";
import type { User } from "../../types/user.types";
import { countries } from "../../utils/countries";
import { createServiceLogger } from "../../utils/logger";

interface UserManagementProps {
  currentUserId: string;
}

interface UserSearchFilters {
  search: string;
  role: string;
  status: string;
  gender: string;
  country: string;
  onlineOnly: boolean;
}

interface UserActivity {
  messageCount: number;
  reportsReceived: number;
  reportsSubmitted: number;
  blocksReceived: number;
  blocksSubmitted: number;
  lastSeen: string | null;
}

const logger = createServiceLogger('UserManagement');

const UserManagement: Component<UserManagementProps> = (props) => {
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [total, setTotal] = createSignal(0);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [showFilters, setShowFilters] = createSignal(false);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [userActivity, setUserActivity] = createSignal<UserActivity | null>(null);
  const [showUserModal, setShowUserModal] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [selectedUsers, setSelectedUsers] = createSignal<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = createSignal(false);

  const [filters, setFilters] = createSignal<UserSearchFilters>({
    search: "",
    role: "",
    status: "",
    gender: "",
    country: "",
    onlineOnly: false,
  });

  const pageSize = 25;

  onMount(() => {
    loadUsers();
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await adminService.getUsers(
        filters(),
        currentPage(),
        pageSize
      );
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      logger.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    setFilters({ ...filters(), search: searchTerm });
    setCurrentPage(1);
    await loadUsers();
  };

  const handleFilterChange = async (key: keyof UserSearchFilters, value: any) => {
    setFilters({ ...filters(), [key]: value });
    setCurrentPage(1);
    await loadUsers();
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await loadUsers();
  };

  const handleUserAction = async (userId: string, action: "suspend" | "ban" | "activate" | "delete", role?: string) => {
    if (userId === props.currentUserId) {
      alert("You cannot perform this action on your own account");
      return;
    }

    setActionLoading(userId);
    try {
      if (action === "delete") {
        if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
          return;
        }
        await adminService.deleteUser(userId);
      } else if (role) {
        await adminService.updateUserRole(userId, role as any);
      } else {
        const statusMap = {
          suspend: "kicked",
          ban: "banned",
          activate: "active",
        };
        await adminService.updateUserStatus(userId, statusMap[action] as any);
      }
      await loadUsers();
    } catch (error) {
      logger.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action} user. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setUserActivity(null);
    setShowUserModal(true);
    
    try {
      const activity = await adminService.getUserActivity(user.id);
      setUserActivity(activity);
    } catch (error) {
      logger.error("Error loading user activity:", error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      case "vip":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "suspended":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "banned":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const totalPages = () => Math.ceil(total() / pageSize);

  // Bulk action handlers
  const toggleUserSelection = (userId: string) => {
    const selected = new Set(selectedUsers());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    setSelectedUsers(selected);
  };

  const toggleAllUsers = () => {
    if (selectedUsers().size === users().length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users().map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: "suspend" | "ban" | "activate" | "delete", role?: string) => {
    const selected = Array.from(selectedUsers());
    if (selected.length === 0) {
      alert("Please select users to perform bulk action");
      return;
    }

    if (selected.includes(props.currentUserId)) {
      alert("Cannot perform bulk action on your own account");
      return;
    }

    const actionName = action === "activate" ? "activate" : 
                      action === "suspend" ? "suspend" : 
                      action === "ban" ? "ban" : "delete";
    
    if (action === "delete") {
      if (!confirm(`Are you sure you want to permanently delete ${selected.length} user${selected.length > 1 ? 's' : ''}? This action cannot be undone.`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to ${actionName} ${selected.length} user${selected.length > 1 ? 's' : ''}?`)) {
        return;
      }
    }

    setBulkActionLoading(true);
    try {
      const promises = selected.map(userId => {
        if (action === "delete") {
          return adminService.deleteUser(userId);
        } else if (role) {
          return adminService.updateUserRole(userId, role as any);
        } else {
          const statusMap = {
            suspend: "kicked",
            ban: "banned",
            activate: "active",
          };
          return adminService.updateUserStatus(userId, statusMap[action] as any);
        }
      });

      await Promise.all(promises);
      await loadUsers();
      setSelectedUsers(new Set());
      alert(`Successfully ${actionName}${action === "activate" || action === "suspend" ? "ed" : action === "ban" ? "ned" : "d"} ${selected.length} user${selected.length > 1 ? 's' : ''}`);
    } catch (error) {
      logger.error(`Error performing bulk ${action}:`, error);
      alert(`Failed to ${actionName} users. Please try again.`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div class="mt-4 sm:mt-0">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Total: {total()} users
          </span>
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
                placeholder="Search users by nickname..."
                value={filters().search}
                onInput={(e) => handleSearch(e.currentTarget.value)}
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
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={filters().role}
                  onChange={(e) => handleFilterChange("role", e.currentTarget.value)}
                  class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters().status}
                  onChange={(e) => handleFilterChange("status", e.currentTarget.value)}
                  class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select
                  value={filters().gender}
                  onChange={(e) => handleFilterChange("gender", e.currentTarget.value)}
                  class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Online Only */}
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Online Status
                </label>
                <label class="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={filters().onlineOnly}
                    onChange={(e) => handleFilterChange("onlineOnly", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Online only
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Bulk Actions */}
      <Show when={selectedUsers().size > 0}>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedUsers().size} user{selectedUsers().size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedUsers(new Set())}
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Clear selection
              </button>
            </div>
            
            <div class="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction("activate")}
                disabled={bulkActionLoading()}
                class="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction("suspend")}
                disabled={bulkActionLoading()}
                class="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-colors"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction("ban")}
                disabled={bulkActionLoading()}
                class="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                Ban
              </button>
              <div class="relative group">
                <button
                  disabled={bulkActionLoading()}
                  class="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 transition-colors"
                >
                  VIP Actions ▼
                </button>
                <div class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-10">
                  <div class="py-1">
                    <button
                      onClick={() => handleBulkAction("activate", "vip")}
                      disabled={bulkActionLoading()}
                      class="block w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50"
                    >
                      Make VIP
                    </button>
                    <button
                      onClick={() => handleBulkAction("activate", "standard")}
                      disabled={bulkActionLoading()}
                      class="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 disabled:opacity-50"
                    >
                      Remove VIP
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={bulkActionLoading()}
                class="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors border border-red-300 dark:border-red-600"
              >
                {bulkActionLoading() ? "Processing..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Users Table */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers().size === users().length && users().length > 0}
                    onChange={toggleAllUsers}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <Show when={loading()}>
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading users...
                  </td>
                </tr>
              </Show>
              <Show when={!loading() && users().length === 0}>
                <tr>
                  <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found matching your criteria
                  </td>
                </tr>
              </Show>
              <For each={users()}>
                {(user) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers().has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        disabled={user.id === props.currentUserId}
                        class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center">
                        <img
                          src={user.avatar}
                          alt={user.nickname}
                          class="h-10 w-10 rounded-full object-cover"
                        />
                        <div class="ml-4">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                              {user.nickname}
                            </span>
                            <Show when={user.online}>
                              <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                            </Show>
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">
                            {user.gender} • {user.age} years
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <CountryFlag country={user.country} size="w-4 h-4" />
                        <span class="text-sm text-gray-900 dark:text-white">
                          {user.country}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          class="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                          title="View Details"
                        >
                          <FiEye size={16} />
                        </button>
                        <div class="relative group">
                          <button
                            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Actions"
                          >
                            <FiMoreVertical size={16} />
                          </button>
                          <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-10">
                            <div class="py-1">
                              <Show when={user.status !== "active"}>
                                <button
                                  onClick={() => handleUserAction(user.id, "activate")}
                                  disabled={actionLoading() === user.id}
                                  class="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                >
                                  Activate
                                </button>
                              </Show>
                              <Show when={user.status === "active"}>
                                <button
                                  onClick={() => handleUserAction(user.id, "suspend")}
                                  disabled={actionLoading() === user.id}
                                  class="block w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              </Show>
                              <button
                                onClick={() => handleUserAction(user.id, "ban")}
                                disabled={actionLoading() === user.id}
                                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                              >
                                Ban
                              </button>
                              <Show when={user.role !== "vip"}>
                                <button
                                  onClick={() => handleUserAction(user.id, "activate", "vip")}
                                  disabled={actionLoading() === user.id}
                                  class="block w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50"
                                >
                                  Make VIP
                                </button>
                              </Show>
                              <Show when={user.role === "vip"}>
                                <button
                                  onClick={() => handleUserAction(user.id, "activate", "standard")}
                                  disabled={actionLoading() === user.id}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 disabled:opacity-50"
                                >
                                  Remove VIP
                                </button>
                              </Show>
                              <div class="border-t border-gray-200 dark:border-gray-600"></div>
                              <button
                                onClick={() => handleUserAction(user.id, "delete")}
                                disabled={actionLoading() === user.id}
                                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                              >
                                Delete User
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage() - 1) * pageSize) + 1} to {Math.min(currentPage() * pageSize, total())} of {total()} users
              </div>
              <div class="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage() - 1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage() + 1)}
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

      {/* User Details Modal */}
      <Show when={showUserModal() && selectedUser()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                  User Details
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div class="space-y-6">
                {/* User Profile */}
                <div class="flex items-start gap-4">
                  <img
                    src={selectedUser()!.avatar}
                    alt={selectedUser()!.nickname}
                    class="h-16 w-16 rounded-full object-cover"
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                        {selectedUser()!.nickname}
                      </h3>
                      <Show when={selectedUser()!.online}>
                        <div class="flex items-center gap-1">
                          <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span class="text-xs text-green-600 dark:text-green-400">Online</span>
                        </div>
                      </Show>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{selectedUser()!.gender} • {selectedUser()!.age} years</span>
                      <div class="flex items-center gap-1">
                        <CountryFlag country={selectedUser()!.country} size="w-4 h-4" />
                        {selectedUser()!.country}
                      </div>
                    </div>
                    <div class="flex items-center gap-2 mt-2">
                      <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser()!.role)}`}>
                        {selectedUser()!.role}
                      </span>
                      <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedUser()!.status)}`}>
                        {selectedUser()!.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Activity Statistics
                  </h4>
                  <Show when={userActivity()} fallback={<div class="text-gray-500">Loading activity...</div>}>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">Messages Sent</p>
                        <p class="text-lg font-bold text-blue-700 dark:text-blue-300">{userActivity()!.messageCount}</p>
                      </div>
                      <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <p class="text-xs text-red-600 dark:text-red-400 font-medium">Reports Received</p>
                        <p class="text-lg font-bold text-red-700 dark:text-red-300">{userActivity()!.reportsReceived}</p>
                      </div>
                      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <p class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Reports Submitted</p>
                        <p class="text-lg font-bold text-yellow-700 dark:text-yellow-300">{userActivity()!.reportsSubmitted}</p>
                      </div>
                      <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">Blocks Received</p>
                        <p class="text-lg font-bold text-purple-700 dark:text-purple-300">{userActivity()!.blocksReceived}</p>
                      </div>
                      <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <p class="text-xs text-green-600 dark:text-green-400 font-medium">Blocks Submitted</p>
                        <p class="text-lg font-bold text-green-700 dark:text-green-300">{userActivity()!.blocksSubmitted}</p>
                      </div>
                      <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Last Seen</p>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {userActivity()!.lastSeen ? new Date(userActivity()!.lastSeen).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>
                  </Show>
                </div>

                {/* Activity Timeline */}
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Recent Activity Timeline
                  </h4>
                  <div class="space-y-4">
                    {/* Timeline items - in a real app, this would be fetched from the database */}
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900 dark:text-white">
                          Account created
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {selectedUser() ? new Date(selectedUser()!.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                    
                    <Show when={selectedUser()?.role === "vip"}>
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-900 dark:text-white">
                            Upgraded to VIP
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {selectedUser()?.vipExpiresAt ? 
                              `Expires: ${new Date(selectedUser()!.vipExpiresAt!).toLocaleString()}` : 
                              "Lifetime VIP"
                            }
                          </p>
                        </div>
                      </div>
                    </Show>

                    <Show when={userActivity()?.lastSeen}>
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-900 dark:text-white">
                            Last active
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {userActivity()!.lastSeen ? new Date(userActivity()!.lastSeen).toLocaleString() : "Never"}
                          </p>
                        </div>
                      </div>
                    </Show>

                    <Show when={userActivity()?.reportsReceived && userActivity()!.reportsReceived > 0}>
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-900 dark:text-white">
                            {userActivity()!.reportsReceived} report{userActivity()!.reportsReceived > 1 ? 's' : ''} received
                          </p>
                          <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                            Requires attention
                          </p>
                        </div>
                      </div>
                    </Show>

                    <Show when={selectedUser()?.status !== "active"}>
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-900 dark:text-white">
                            Account {selectedUser()!.status}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Status changed by admin
                          </p>
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>

                {/* Account Info */}
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Account Information
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-gray-600 dark:text-gray-400">User ID:</span>
                      <span class="ml-2 font-mono text-gray-900 dark:text-white">{selectedUser()!.id}</span>
                    </div>
                    <div>
                      <span class="text-gray-600 dark:text-gray-400">Created At:</span>
                      <span class="ml-2 text-gray-900 dark:text-white">
                        {new Date(selectedUser()!.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Show when={selectedUser()!.vipExpiresAt}>
                      <div>
                        <span class="text-gray-600 dark:text-gray-400">VIP Expires:</span>
                        <span class="ml-2 text-gray-900 dark:text-white">
                          {new Date(selectedUser()!.vipExpiresAt!).toLocaleString()}
                        </span>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default UserManagement;