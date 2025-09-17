import React, { useState, useEffect } from 'react';
import { auditService } from '../../../services/supabase/auditService';
import { createServiceLogger } from '../../../utils/logger';

interface AuditStatisticsProps {
  className?: string;
}

interface StatisticsData {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByTargetType: Record<string, number>;
  entriesByAdmin: Record<string, number>;
  dailyActivity: Array<{ date: string; count: number }>;
}

const logger = createServiceLogger('AuditStatistics');

export const AuditStatistics: React.FC<AuditStatisticsProps> = ({ className = '' }) => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const stats = await auditService.getAuditStatistics(
        dateRange.from,
        dateRange.to
      );
      setStatistics(stats);
    } catch (error) {
      logger.error('Failed to load audit statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopEntries = (data: Record<string, number>, limit: number = 5) => {
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  const getActivityTrend = () => {
    if (!statistics?.dailyActivity) return 'stable';
    
    const recent = statistics.dailyActivity.slice(-7);
    const older = statistics.dailyActivity.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, day) => sum + day.count, 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + day.count, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.2) return 'increasing';
    if (recentAvg < olderAvg * 0.8) return 'decreasing';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <span className="text-green-500">↗️</span>;
      case 'decreasing':
        return <span className="text-red-500">↘️</span>;
      default:
        return <span className="text-gray-500">→</span>;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <p className="text-gray-500 text-center">Failed to load statistics</p>
      </div>
    );
  }

  const activityTrend = getActivityTrend();

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Audit Statistics</h2>
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
            <span className="self-center text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Actions</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalEntries.toLocaleString()}</p>
              </div>
              <div className="text-blue-500">
                📊
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Daily Average</p>
                <p className="text-2xl font-bold text-green-900">
                  {Math.round(statistics.totalEntries / Math.max(statistics.dailyActivity.length, 1))}
                </p>
              </div>
              <div className="text-green-500">
                📈
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Active Admins</p>
                <p className="text-2xl font-bold text-purple-900">
                  {Object.keys(statistics.entriesByAdmin).length}
                </p>
              </div>
              <div className="text-purple-500">
                👥
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Activity Trend</p>
                <p className="text-lg font-bold text-orange-900 capitalize flex items-center">
                  {activityTrend} {getTrendIcon(activityTrend)}
                </p>
              </div>
              <div className="text-orange-500">
                📊
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Actions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Actions</h3>
            <div className="space-y-3">
              {getTopEntries(statistics.entriesByAction).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {action.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / Math.max(...Object.values(statistics.entriesByAction))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Types */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Types</h3>
            <div className="space-y-3">
              {getTopEntries(statistics.entriesByTargetType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(count / Math.max(...Object.values(statistics.entriesByTargetType))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Activity */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active Admins</h3>
            <div className="space-y-3">
              {getTopEntries(statistics.entriesByAdmin).map(([admin, count]) => (
                <div key={admin} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{admin}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(count / Math.max(...Object.values(statistics.entriesByAdmin))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity (Last 14 Days)</h3>
            <div className="flex items-end space-x-1 h-32">
              {statistics.dailyActivity.slice(-14).map((day, index) => {
                const maxCount = Math.max(...statistics.dailyActivity.map(d => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t-sm min-h-1"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} actions`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
          <p className="text-sm text-blue-800">
            In the selected period, there were <strong>{statistics.totalEntries}</strong> admin actions 
            performed by <strong>{Object.keys(statistics.entriesByAdmin).length}</strong> administrators. 
            The most common action was <strong>
              {Object.entries(statistics.entriesByAction).sort(([,a], [,b]) => b - a)[0]?.[0]?.replace('_', ' ')}
            </strong> with <strong>
              {Object.entries(statistics.entriesByAction).sort(([,a], [,b]) => b - a)[0]?.[1]}
            </strong> occurrences.
          </p>
        </div>
      </div>
    </div>
  );
};