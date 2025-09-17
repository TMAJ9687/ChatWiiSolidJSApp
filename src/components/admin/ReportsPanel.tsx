import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiSearch, FiFilter, FiEye, FiCheck, FiX, FiClock } from "solid-icons/fi";
import { adminService } from "../../services/supabase/adminService";
import type { User } from "../../types/user.types";
import { createServiceLogger } from "../../utils/logger";

interface ReportWithUsers {
  id: string;
  reason: string;
  custom_reason?: string;
  description?: string;
  status: "pending" | "resolved" | "reviewed";
  created_at: string;
  resolved_at?: string;
  admin_notes?: string;
  reporter: Pick<User, 'id' | 'nickname' | 'role'>;
  reported: Pick<User, 'id' | 'nickname' | 'role'>;
}

interface ReportsPanelProps {
  currentUserId: string;
}

const logger = createServiceLogger('ReportsPanel');

const ReportsPanel: Component<ReportsPanelProps> = (props) => {
  const [reports, setReports] = createSignal<ReportWithUsers[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [total, setTotal] = createSignal(0);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [statusFilter, setStatusFilter] = createSignal<"pending" | "resolved" | "reviewed" | "">("");
  const [selectedReport, setSelectedReport] = createSignal<ReportWithUsers | null>(null);
  const [showReportModal, setShowReportModal] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [adminNotes, setAdminNotes] = createSignal("");

  const pageSize = 25;

  onMount(() => {
    loadReports();
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await adminService.getReports(
        statusFilter() || undefined,
        currentPage(),
        pageSize
      );
      setReports(result.reports);
      setTotal(result.total);
    } catch (error) {
      logger.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = async (status: typeof statusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
    await loadReports();
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await loadReports();
  };

  const handleViewReport = (report: ReportWithUsers) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
    setShowReportModal(true);
  };

  const handleUpdateReportStatus = async (reportId: string, status: "resolved" | "reviewed") => {
    setActionLoading(reportId);
    try {
      await adminService.updateReportStatus(reportId, status, adminNotes());
      await loadReports();
      setShowReportModal(false);
    } catch (error) {
      logger.error(`Error updating report status:`, error);
      alert(`Failed to update report status. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      case "resolved":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "reviewed":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: Record<string, string> = {
      under_age: "Under Age",
      abusive: "Abusive Behavior",
      scams: "Scams/Fraud",
      spam: "Spam",
      inappropriate: "Inappropriate Content",
      other: "Other"
    };
    return reasonMap[reason] || reason;
  };

  const getPriorityColor = (reason: string) => {
    const highPriority = ["under_age", "abusive", "scams"];
    if (highPriority.includes(reason)) {
      return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
    }
    return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30";
  };

  const totalPages = () => Math.ceil(total() / pageSize);

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Reports Panel
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review and manage user reports
          </p>
        </div>
        <div class="mt-4 sm:mt-0">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Total: {total()} reports
          </span>
        </div>
      </div>

      {/* Status Filter */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilterChange("")}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter() === ""
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => handleStatusFilterChange("pending")}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter() === "pending"
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Pending ({reports().filter(r => r.status === "pending").length})
          </button>
          <button
            onClick={() => handleStatusFilterChange("resolved")}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter() === "resolved"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => handleStatusFilterChange("reviewed")}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter() === "reviewed"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Reviewed
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reporter
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reported User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reason
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
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
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Loading reports...
                  </td>
                </tr>
              </Show>
              <Show when={!loading() && reports().length === 0}>
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No reports found
                  </td>
                </tr>
              </Show>
              <For each={reports()}>
                {(report) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {report.reporter?.nickname || "Unknown"}
                        </span>
                        <Show when={report.reporter?.role === "vip"}>
                          <span class="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                            VIP
                          </span>
                        </Show>
                        <Show when={report.reporter?.role === "admin"}>
                          <span class="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                            ADMIN
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {report.reported?.nickname || "Unknown"}
                        </span>
                        <Show when={report.reported?.role === "vip"}>
                          <span class="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                            VIP
                          </span>
                        </Show>
                        <Show when={report.reported?.role === "admin"}>
                          <span class="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                            ADMIN
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col gap-1">
                        <span class={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${getPriorityColor(report.reason)}`}>
                          {getReasonLabel(report.reason)}
                        </span>
                        <Show when={report.custom_reason}>
                          <span class="text-xs text-gray-500 dark:text-gray-400 max-w-32 truncate">
                            {report.custom_reason}
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        <Show when={report.status === "pending"}>
                          <FiClock size={12} />
                        </Show>
                        <Show when={report.status === "resolved"}>
                          <FiCheck size={12} />
                        </Show>
                        <Show when={report.status === "reviewed"}>
                          <FiEye size={12} />
                        </Show>
                        {report.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div class="flex flex-col">
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        <span class="text-xs">{new Date(report.created_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewReport(report)}
                        class="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>
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
                Showing {((currentPage() - 1) * pageSize) + 1} to {Math.min(currentPage() * pageSize, total())} of {total()} reports
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

      {/* Report Details Modal */}
      <Show when={showReportModal() && selectedReport()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                  Report Details
                </h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div class="space-y-6">
                {/* Report Info */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Reporter</h3>
                    <div class="flex items-center gap-2">
                      <span class="text-gray-900 dark:text-white">
                        {selectedReport()!.reporter?.nickname || "Unknown"}
                      </span>
                      <Show when={selectedReport()!.reporter?.role !== "standard"}>
                        <span class={`px-1.5 py-0.5 text-xs rounded ${
                          selectedReport()!.reporter?.role === "vip" 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {selectedReport()!.reporter?.role?.toUpperCase()}
                        </span>
                      </Show>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Reported User</h3>
                    <div class="flex items-center gap-2">
                      <span class="text-gray-900 dark:text-white">
                        {selectedReport()!.reported?.nickname || "Unknown"}
                      </span>
                      <Show when={selectedReport()!.reported?.role !== "standard"}>
                        <span class={`px-1.5 py-0.5 text-xs rounded ${
                          selectedReport()!.reported?.role === "vip" 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {selectedReport()!.reported?.role?.toUpperCase()}
                        </span>
                      </Show>
                    </div>
                  </div>
                </div>

                {/* Reason & Status */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Reason</h3>
                    <span class={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedReport()!.reason)}`}>
                      {getReasonLabel(selectedReport()!.reason)}
                    </span>
                    <Show when={selectedReport()!.custom_reason}>
                      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Custom reason: {selectedReport()!.custom_reason}
                      </p>
                    </Show>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h3>
                    <span class={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedReport()!.status)}`}>
                      <Show when={selectedReport()!.status === "pending"}>
                        <FiClock size={14} />
                      </Show>
                      <Show when={selectedReport()!.status === "resolved"}>
                        <FiCheck size={14} />
                      </Show>
                      <Show when={selectedReport()!.status === "reviewed"}>
                        <FiEye size={14} />
                      </Show>
                      {selectedReport()!.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <Show when={selectedReport()!.description}>
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedReport()!.description}
                    </p>
                  </div>
                </Show>

                {/* Timestamps */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Reported At</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(selectedReport()!.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Show when={selectedReport()!.resolved_at}>
                    <div>
                      <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Resolved At</h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(selectedReport()!.resolved_at!).toLocaleString()}
                      </p>
                    </div>
                  </Show>
                </div>

                {/* Admin Notes */}
                <div>
                  <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Admin Notes</h3>
                  <textarea
                    value={adminNotes()}
                    onInput={(e) => setAdminNotes(e.currentTarget.value)}
                    placeholder="Add notes about this report (optional)..."
                    rows="3"
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Actions */}
                <Show when={selectedReport()!.status === "pending"}>
                  <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleUpdateReportStatus(selectedReport()!.id, "reviewed")}
                      disabled={actionLoading() === selectedReport()!.id}
                      class="px-4 py-2 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateReportStatus(selectedReport()!.id, "resolved")}
                      disabled={actionLoading() === selectedReport()!.id}
                      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading() === selectedReport()!.id ? "Processing..." : "Resolve"}
                    </button>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ReportsPanel;