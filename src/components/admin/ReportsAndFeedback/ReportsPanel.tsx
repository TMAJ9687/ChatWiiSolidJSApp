import React, { useState, useEffect } from 'react';
import { ReportWithUsers } from '../../../types/admin.types';
import { reportsService } from '../../../services/supabase/reportsService';

interface ReportsPanelProps {
  className?: string;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ className = '' }) => {
  const [reports, setReports] = useState<ReportWithUsers[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportWithUsers | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, searchTerm]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getAllReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.reporter.nickname.toLowerCase().includes(term) ||
        report.reported.nickname.toLowerCase().includes(term) ||
        report.reason.toLowerCase().includes(term) ||
        (report.description && report.description.toLowerCase().includes(term))
      );
    }

    setFilteredReports(filtered);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: 'pending' | 'reviewed' | 'resolved') => {
    try {
      setUpdating(true);
      await reportsService.updateReportStatus(reportId, newStatus, adminNotes);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : report.resolvedAt }
          : report
      ));
      
      setShowModal(false);
      setSelectedReport(null);
      setAdminNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status');
    } finally {
      setUpdating(false);
    }
  };

  const openReportModal = (report: ReportWithUsers) => {
    setSelectedReport(report);
    setAdminNotes('');
    setShowModal(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
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
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Reports Management</h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search reports..."
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
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-lg font-semibold">{reports.length}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-lg font-semibold">{reports.filter(r => r.status === 'pending').length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Reviewed</div>
            <div className="text-lg font-semibold">{reports.filter(r => r.status === 'reviewed').length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-lg font-semibold">{reports.filter(r => r.status === 'resolved').length}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadReports}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="p-6">
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'all' ? 'No reports match your filters' : 'No reports found'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => openReportModal(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(report.status)}`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(report.createdAt)}</span>
                    </div>
                    
                    <div className="mb-2">
                      <span className="font-medium text-gray-900">{report.reporter.nickname}</span>
                      <span className="text-gray-600"> reported </span>
                      <span className="font-medium text-gray-900">{report.reported.nickname}</span>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>Reason:</strong> {report.reason}
                    </div>
                    
                    {report.description && (
                      <div className="text-sm text-gray-600">
                        <strong>Description:</strong> {report.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReportModal(report);
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

      {/* Report Management Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Manage Report</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
                  <p className="text-gray-900">{selectedReport.reporter.nickname} ({selectedReport.reporter.role})</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reported User</label>
                  <p className="text-gray-900">{selectedReport.reported.nickname} ({selectedReport.reported.role})</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <p className="text-gray-900">{selectedReport.reason}</p>
                </div>
                
                {selectedReport.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{selectedReport.description}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedReport.status)}`}>
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                  <p className="text-gray-900">{formatDate(selectedReport.createdAt)}</p>
                </div>
                
                {selectedReport.resolvedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolved</label>
                    <p className="text-gray-900">{formatDate(selectedReport.resolvedAt)}</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes about this report..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={updating}
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                {selectedReport.status !== 'reviewed' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedReport.id, 'reviewed')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={updating}
                  >
                    Mark as Reviewed
                  </button>
                )}
                
                {selectedReport.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedReport.id, 'resolved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    disabled={updating}
                  >
                    Mark as Resolved
                  </button>
                )}
                
                {selectedReport.status !== 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedReport.id, 'pending')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    disabled={updating}
                  >
                    Mark as Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};