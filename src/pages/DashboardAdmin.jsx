import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Search, UploadCloud
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend, LabelList
} from 'recharts';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { adminAPI } from '../services/api.js';

const humanizeAction = (value = '') =>
  value.toString().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const formatTimestamp = (value) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
};

const formatNumber = (value = 0) => Number(value || 0).toLocaleString();

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  const precision = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[index]}`;
};

const getStatusBadge = (status) => {
  if (!status) return null;
  let normalized = status.toLowerCase();
  if (normalized === 'failed') normalized = 'failure';
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failure: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[normalized] || styles.default}`}>
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
};

const getActivityIcon = (status) => {
  const normalized = status?.toLowerCase();
  if (normalized === 'success') return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  if (normalized === 'failure' || normalized === 'failed') return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (normalized === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Activity className="h-4 w-4 text-blue-600" />;
};

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981', 
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#a855f7',
  cyan: '#06b6d4',
  slate: '#64748b'
};

function DashboardAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const ACTIVITY_PAGE_SIZE = 5;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0, lockedUsers: 0,
    totalDocuments: 0, totalDownloads: 0, recentUploads: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [documentSummary, setDocumentSummary] = useState({ totalSize: 0, totalDownloads: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    activityTrend: [],
    actionBreakdown: [],
    successRate: { successful: 0, failed: 0, total: 0 }
  });

  const loadDashboard = useCallback(async (isCancelled = () => false) => {
    if (isCancelled()) return;
    setLoading(true);
    try {

      const [statsRes, docsRes, allLogsRes] = await Promise.allSettled([
        adminAPI.getStats(),
        adminAPI.getAllDocuments({ limit: 1 }),
        adminAPI.getLogs({ limit: 500 })
      ]);

      if (isCancelled()) return;

      // Handle stats
      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value?.data?.data || {};
        setStats(statsData);
      } else {
        showToast('Failed to load statistics', 'warning');
      }

      // Handle documents
      if (docsRes.status === 'fulfilled') {
        const docsSummary = docsRes.value?.data?.data || {};
        setDocumentSummary({
          totalSize: docsSummary.totalSize || 0,
          totalDownloads: docsSummary.totalDownloads || 0,
        });
      }

      // Handle analytics from logs
      if (allLogsRes.status === 'fulfilled') {
        const allLogs = allLogsRes.value?.data?.data?.logs || [];
        
        // Activity trend - last 7 days
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });
        
        const trendData = last7Days.map(date => {
          const dayLogs = allLogs.filter(log => log.timestamp.startsWith(date));
          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            activities: dayLogs.length,
            successful: dayLogs.filter(l => l.status === 'SUCCESS').length,
            failed: dayLogs.filter(l => l.status === 'FAILURE').length
          };
        });
        
        // Action type breakdown
        const actionCounts = {};
        allLogs.forEach(log => {
          const action = log.action;
          actionCounts[action] = (actionCounts[action] || 0) + 1;
        });
        
        const actionData = Object.entries(actionCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([action, count]) => ({
            name: humanizeAction(action),
            count,
            percentage: Math.round((count / allLogs.length) * 100)
          }));
        
        // Success rate
        const successful = allLogs.filter(l => l.status === 'SUCCESS').length;
        const failed = allLogs.filter(l => l.status === 'FAILURE').length;
        
        setAnalytics({
          activityTrend: trendData,
          actionBreakdown: actionData,
          successRate: { successful, failed, total: allLogs.length }
        });
      }

    } catch (error) {
      if (!isCancelled()) showToast('Failed to load dashboard data', 'error');
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [showToast]);

  const loadRecentActivity = useCallback(async (isCancelled = () => false) => {
    if (isCancelled()) return;
    setActivityLoading(true);
    try {
      const offset = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
      const logsRes = await adminAPI.getLogs({ limit: ACTIVITY_PAGE_SIZE, offset });

      if (isCancelled()) return;

      const logsData = logsRes?.data?.data?.logs || [];
      const logsTotal = logsRes?.data?.data?.total || 0;

      setRecentActivity(logsData.map((log) => ({
        id: log.id,
        action: humanizeAction(log.action),
        status: (log.status || 'success').toLowerCase(),
        timestamp: log.timestamp,
        user: log.user?.email || 'System',
        resource: log.document?.fileName || 'Platform',
      })));
      setActivityTotal(logsTotal);
    } catch (error) {
      if (!isCancelled()) showToast('Failed to load recent activity', 'error');
    } finally {
      if (!isCancelled()) setActivityLoading(false);
    }
  }, [activityPage, showToast]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') {
      navigate('/dashboard');
      showToast('Admin access required', 'warning');
      return;
    }
    let cancelled = false;
    loadDashboard(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [user, navigate, loadDashboard]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') {
      return;
    }
    let cancelled = false;
    loadRecentActivity(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [user, activityPage, loadRecentActivity]);


  const filteredActivity = useMemo(() => {
    if (!searchTerm) return recentActivity;
    const term = searchTerm.toLowerCase();
    return recentActivity.filter((item) =>
      [item.action, item.user, item.resource].some((field) => field?.toLowerCase().includes(term))
    );
  }, [recentActivity, searchTerm]);

  const successRatePercentage = useMemo(() => {
    const { successful, total } = analytics.successRate;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }, [analytics.successRate]);

  const activityTotalPages = Math.max(1, Math.ceil(activityTotal / ACTIVITY_PAGE_SIZE));

  const handleRefresh = () => {
    loadDashboard(() => false);
    loadRecentActivity(() => false);
  };

  const handleViewLogs = () => navigate('/audit-logs');
  const handleManageUsers = () => navigate('/users');
  const handleViewDocuments = () => navigate('/documents');

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">System overview and analytics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
             <Card padding="sm" className="border-l-4 border-l-blue-500">
               <div className="flex justify-between items-center">
                 <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p><p className="text-2xl font-bold dark:text-white">{formatNumber(stats.totalUsers)}</p></div>
                 <Users className="text-blue-500 h-8 w-8 opacity-20" />
               </div>
             </Card>
             <Card padding="sm" className="border-l-4 border-l-purple-500">
               <div className="flex justify-between items-center">
                 <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Documents</p><p className="text-2xl font-bold dark:text-white">{formatNumber(stats.totalDocuments)}</p></div>
                 <FileText className="text-purple-500 h-8 w-8 opacity-20" />
               </div>
             </Card>
             <Card padding="sm" className="border-l-4 border-l-emerald-500">
               <div className="flex justify-between items-center">
                 <div><p className="text-sm text-slate-500 dark:text-slate-400">Active Users</p><p className="text-2xl font-bold dark:text-white">{formatNumber(stats.activeUsers)}</p></div>
                 <CheckCircle className="text-emerald-500 h-8 w-8 opacity-20" />
               </div>
             </Card>
             <Card padding="sm" className="border-l-4 border-l-red-500">
               <div className="flex justify-between items-center">
                 <div><p className="text-sm text-slate-500 dark:text-slate-400">Locked Accounts</p><p className="text-2xl font-bold dark:text-white">{formatNumber(stats.lockedUsers)}</p></div>
                 <Shield className="text-red-500 h-8 w-8 opacity-20" />
               </div>
             </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Activity Trend - Full Width */}
            <Card>
              <Card.Header>
                <Card.Title>Activity Trend (Last 7 Days)</Card.Title>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Daily system activity with success/failure breakdown
                </p>
              </Card.Header>
              <Card.Content className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.activityTrend}>
                    <defs>
                      <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '8px' }}
                      itemStyle={{ color: '#cbd5e1', padding: '4px 0' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="successful" 
                      stroke={CHART_COLORS.success} 
                      fillOpacity={1} 
                      fill="url(#colorSuccessful)"
                      strokeWidth={2}
                      name="Successful"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="activities" 
                      stroke={CHART_COLORS.primary} 
                      fillOpacity={1} 
                      fill="url(#colorActivities)"
                      strokeWidth={2}
                      name="Total Activities"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>
          </div>

          {/* Two Column Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Action Breakdown */}
            <Card>
              <Card.Header>
                <Card.Title>Top Actions</Card.Title>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Most frequent system operations
                </p>
              </Card.Header>
              <Card.Content className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={analytics.actionBreakdown}
                    layout="vertical"
                    margin={{ left: 20, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      type="number"
                      stroke="#94a3b8" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      stroke="#94a3b8" 
                      width={120}
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill={CHART_COLORS.primary}
                      radius={[0, 8, 8, 0]}
                    >
                      <LabelList 
                        dataKey="percentage" 
                        position="right"
                        formatter={(value) => `${value}%`}
                        style={{ fill: '#94a3b8', fontSize: '11px' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>

            {/* System Health Metrics */}
            <Card>
              <Card.Header>
                <Card.Title>System Health</Card.Title>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Success rate and performance metrics
                </p>
              </Card.Header>
              <Card.Content>
                {/* Success Rate Circle */}
                <div className="flex items-center justify-center py-6">
                  <div className="relative">
                    <svg width="180" height="180" viewBox="0 0 180 180">
                      <circle
                        cx="90"
                        cy="90"
                        r="70"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="20"
                      />
                      <circle
                        cx="90"
                        cy="90"
                        r="70"
                        fill="none"
                        stroke={CHART_COLORS.success}
                        strokeWidth="20"
                        strokeDasharray={`${successRatePercentage * 4.4} ${(100 - successRatePercentage) * 4.4}`}
                        strokeLinecap="round"
                        transform="rotate(-90 90 90)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-slate-900 dark:text-white">
                        {successRatePercentage}%
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Success Rate
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(analytics.successRate.successful)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Successful
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatNumber(analytics.successRate.failed)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Failed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatNumber(analytics.successRate.total)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Total
                    </div>
                  </div>
                </div>

                {/* Storage Info */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Storage</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatBytes(documentSummary.totalSize)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Documents</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatNumber(stats.totalDocuments)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Downloads</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatNumber(stats.totalDownloads)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Recent Uploads (7d)</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatNumber(stats.recentUploads)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Active Users</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(stats.activeUsers)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Locked Accounts</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatNumber(stats.lockedUsers)}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Activity Section */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
            <Card className="xl:col-span-2">
              <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Card.Title>Recent Activity</Card.Title>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Latest administrative and security events ({activityTotal} total).</p>
                </div>
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search activity..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    icon={<Search size={18} />}
                  />
                </div>
              </Card.Header>
              <Card.Content>
                {activityLoading ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
                    Loading recent activity...
                  </div>
                ) : filteredActivity.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
                    No activity found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-white dark:bg-slate-700 p-1.5 shadow-sm">
                            {getActivityIcon(item.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{item.action}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.user} {item.resource ? ` • ${item.resource}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1 sm:items-end">
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatTimestamp(item.timestamp)}</span>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                      disabled={activityPage === 1 || activityLoading}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Page {activityPage} of {activityTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivityPage((prev) => Math.min(activityTotalPages, prev + 1))}
                      disabled={activityPage === activityTotalPages || activityLoading}
                    >
                      Next
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleViewLogs}>
                    View Full Audit Logs
                  </Button>
                </div>
              </Card.Content>
            </Card>

            <div className="space-y-6">
              <Card padding="sm">
                <Card.Header className="mb-2">
                  <Card.Title>System Snapshot</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Storage Used</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatBytes(documentSummary.totalSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Total Downloads</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(documentSummary.totalDownloads)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Uploads (7 days)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(stats.recentUploads)}</span>
                  </div>
                </Card.Content>
              </Card>

              <Card padding="sm">
                <Card.Header className="mb-2">
                  <Card.Title>Quick Actions</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleManageUsers}>
                    <Users className="h-4 w-4" /> <span>Manage Users</span>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleViewDocuments}>
                    <FileText className="h-4 w-4" /> <span>All Documents</span>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleViewLogs}>
                    <Activity className="h-4 w-4" /> <span>Audit Logs</span>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => navigate('/dashboard')}>
                    <Shield className="h-4 w-4" /> <span>User Dashboard</span>
                  </Button>
                </Card.Content>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardAdmin;