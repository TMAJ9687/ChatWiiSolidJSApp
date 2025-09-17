import { Component, createSignal, createEffect, For, Show } from "solid-js";
import { adminService } from "../../services/supabase";
import type { Feedback } from "../../services/supabase/feedbackService";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('FeedbackPanel');

const FeedbackPanel: Component = () => {
  const [feedback, setFeedback] = createSignal<Feedback[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [totalCount, setTotalCount] = createSignal(0);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending' | 'read' | 'in_progress' | 'resolved'>('all');
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);

  const pageSize = 20;

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const filter = statusFilter() === 'all' ? undefined : statusFilter() as 'pending' | 'read' | 'in_progress' | 'resolved';
      const result = await adminService.getFeedback(filter, currentPage(), pageSize);
      setFeedback(result.feedback);
      setTotalCount(result.total);
    } catch (error) {
      logger.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadFeedback();
  });

  createEffect(() => {
    // Reload when filter changes
    statusFilter();
    setCurrentPage(1);
    loadFeedback();
  });

  const handleStatusChange = async (feedbackId: string, newStatus: 'pending' | 'read' | 'in_progress' | 'resolved') => {
    setActionLoading(feedbackId);
    try {
      await adminService.updateFeedbackStatus(feedbackId, newStatus);
      await loadFeedback();
    } catch (error) {
      logger.error("Error updating feedback status:", error);
      alert("Failed to update feedback status. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback? This action cannot be undone.")) {
      return;
    }

    setActionLoading(feedbackId);
    try {
      await adminService.deleteFeedback(feedbackId);
      await loadFeedback();
    } catch (error) {
      logger.error("Error deleting feedback:", error);
      alert("Failed to delete feedback. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      case 'read':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`;
    }
  };

  const totalPages = () => Math.ceil(totalCount() / pageSize);

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          User Feedback
        </h2>
        
        {/* Status Filter */}
        <select
          value={statusFilter()}
          onChange={(e) => setStatusFilter(e.currentTarget.value as any)}
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Feedback</option>
          <option value="pending">Pending</option>
          <option value="read">Read</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-5 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">Total</div>
          <div class="text-2xl font-semibold text-gray-900 dark:text-white">{totalCount()}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          <div class="text-2xl font-semibold text-red-600">{feedback().filter(f => f.status === 'pending').length}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">Read</div>
          <div class="text-2xl font-semibold text-yellow-600">{feedback().filter(f => f.status === 'read').length}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">In Progress</div>
          <div class="text-2xl font-semibold text-blue-600">{feedback().filter(f => f.status === 'in_progress').length}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">Resolved</div>
          <div class="text-2xl font-semibold text-green-600">{feedback().filter(f => f.status === 'resolved').length}</div>
        </div>
      </div>

      {/* Feedback List */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Show when={!loading()} fallback={
          <div class="p-8 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">Loading feedback...</p>
          </div>
        }>
          <Show when={feedback().length > 0} fallback={
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
              No feedback found.
            </div>
          }>
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              <For each={feedback()}>
                {(item) => (
                  <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <span class={getStatusBadge(item.status)}>
                            {item.status}
                          </span>
                          {item.user_id && (
                            <span class="text-sm text-gray-600 dark:text-gray-400">
                              from User {item.user_id.slice(0, 8)}...
                            </span>
                          )}
                          {item.email && (
                            <span class="text-sm text-gray-600 dark:text-gray-400">
                              ({item.email})
                            </span>
                          )}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                      
                      <div class="flex gap-2">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'read')}
                            disabled={actionLoading() === item.id}
                            class="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Mark Read
                          </button>
                        )}
                        {(item.status === 'pending' || item.status === 'read') && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'in_progress')}
                            disabled={actionLoading() === item.id}
                            class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            In Progress
                          </button>
                        )}
                        {(item.status === 'read' || item.status === 'in_progress') && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'resolved')}
                            disabled={actionLoading() === item.id}
                            class="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={actionLoading() === item.id}
                          class="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p class="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {item.feedback_text || item.message}
                      </p>
                    </div>

                    {item.admin_notes && (
                      <div class="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          Admin Notes:
                        </div>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                          {item.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage() - 1) * pageSize) + 1} to {Math.min(currentPage() * pageSize, totalCount())} of {totalCount()} results
            </div>
            <div class="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage() - 1))}
                disabled={currentPage() === 1}
                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span class="px-3 py-1 text-sm">
                Page {currentPage()} of {totalPages()}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages(), currentPage() + 1))}
                disabled={currentPage() === totalPages()}
                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FeedbackPanel;