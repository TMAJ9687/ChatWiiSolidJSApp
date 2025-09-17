import React, { useState, useEffect } from 'react';
import { FeedbackWithUser } from '../../../types/admin.types';
import { feedbackService } from '../../../services/supabase/feedbackService';

interface FeedbackPanelProps {
  className?: string;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ className = '' }) => {
  const [feedback, setFeedback] = useState<FeedbackWithUser[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<FeedbackWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'read' | 'in_progress' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'complaint' | 'suggestion' | 'other'>('other');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    filterFeedback();
  }, [feedback, statusFilter, searchTerm]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedbackService.getAllFeedback();
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedback = () => {
    let filtered = feedback;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.subject.toLowerCase().includes(term) ||
        item.message.toLowerCase().includes(term) ||
        (item.email && item.email.toLowerCase().includes(term)) ||
        (item.user && item.user.nickname.toLowerCase().includes(term))
      );
    }

    setFilteredFeedback(filtered);
  };

  const handleStatusUpdate = async (
    feedbackId: string, 
    newStatus: 'pending' | 'read' | 'in_progress' | 'resolved'
  ) => {
    try {
      setUpdating(true);
      await feedbackService.updateFeedback(feedbackId, {
        status: newStatus,
        adminNotes: adminNotes || undefined,
        category,
        priority
      });
      
      // Update local state
      setFeedback(prev => prev.map(item => 
        item.id === feedbackId 
          ? { 
              ...item, 
              status: newStatus, 
              adminNotes: adminNotes || item.adminNotes,
              category,
              priority,
              updatedAt: new Date().toISOString()
            }
          : item
      ));
      
      setShowModal(false);
      setSelectedFeedback(null);
      setAdminNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback');
    } finally {
      setUpdating(false);
    }
  };

  const openFeedbackModal = (feedbackItem: FeedbackWithUser) => {
    setSelectedFeedback(feedbackItem);
    setAdminNotes(feedbackItem.adminNotes || '');
    setCategory(feedbackItem.category || 'other');
    setPriority(feedbackItem.priority || 'medium');
    setShowModal(true);
    
    // Mark as read if it's pending
    if (feedbackItem.status === 'pending') {
      feedbackService.markAsRead(feedbackItem.id).catch(error => {
        // Silently handle read status update errors
      });
      setFeedback(prev => prev.map(item => 
        item.id === feedbackItem.id ? { ...item, status: 'read' as const } : item
      ));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-800';
      case 'read':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Feedback Management</h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="read">Read</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-lg font-semibold">{feedback.length}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-lg font-semibold">{feedback.filter(f => f.status === 'pending').length}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Read</div>
            <div className="text-lg font-semibold">{feedback.filter(f => f.status === 'read').length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">In Progress</div>
            <div className="text-lg font-semibold">{feedback.filter(f => f.status === 'in_progress').length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-lg font-semibold">{feedback.filter(f => f.status === 'resolved').length}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadFeedback}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="p-6">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'all' ? 'No feedback matches your filters' : 'No feedback found'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedbackItem) => (
              <div
                key={feedbackItem.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => openFeedbackModal(feedbackItem)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(feedbackItem.status)}`}>
                        {feedbackItem.status.charAt(0).toUpperCase() + feedbackItem.status.slice(1).replace('_', ' ')}
                      </span>
                      {feedbackItem.priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(feedbackItem.priority)}`}>
                          {feedbackItem.priority.charAt(0).toUpperCase() + feedbackItem.priority.slice(1)}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">{formatDate(feedbackItem.createdAt)}</span>
                    </div>
                    
                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900">{feedbackItem.subject}</h3>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-2">
                      <p className="line-clamp-2">{feedbackItem.message}</p>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">From:</span>{' '}
                      {feedbackItem.user ? (
                        <span>{feedbackItem.user.nickname} ({feedbackItem.user.role})</span>
                      ) : (
                        <span>{feedbackItem.email || 'Anonymous'}</span>
                      )}
                    </div>
                    
                    {feedbackItem.category && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Category:</span> {feedbackItem.category}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFeedbackModal(feedbackItem);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Management Modal */}
      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Manage Feedback</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feedback Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <p className="text-gray-900 font-medium">{selectedFeedback.subject}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <p className="text-gray-900">
                      {selectedFeedback.user ? (
                        <span>{selectedFeedback.user.nickname} ({selectedFeedback.user.role})</span>
                      ) : (
                        <span>{selectedFeedback.email || 'Anonymous'}</span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                    <p className="text-gray-900">{formatDate(selectedFeedback.createdAt)}</p>
                  </div>
                  
                  {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <p className="text-gray-900">{formatDate(selectedFeedback.updatedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Management Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedFeedback.status)}`}>
                      {selectedFeedback.status.charAt(0).toUpperCase() + selectedFeedback.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="complaint">Complaint</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add notes about this feedback..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedFeedback(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={updating}
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                {selectedFeedback.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'in_progress')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={updating}
                  >
                    Mark In Progress
                  </button>
                )}
                
                {selectedFeedback.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedFeedback.id, 'resolved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    disabled={updating}
                  >
                    Mark Resolved
                  </button>
                )}
                
                <button
                  onClick={() => handleStatusUpdate(selectedFeedback.id, selectedFeedback.status)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  disabled={updating}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};