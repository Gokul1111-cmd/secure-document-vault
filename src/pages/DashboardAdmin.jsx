import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, Clock, Search, UploadCloud
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

function DashboardAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0, lockedUsers: 0,
    totalDocuments: 0, totalDownloads: 0, recentUploads: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [documentSummary, setDocumentSummary] = useState({ totalSize: 0, totalDownloads: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const [statsRes, logsRes, docsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getLogs({ limit: 12 }),
        adminAPI.getAllDocuments({ limit: 1 }), 
      ]);

      if (!isMountedRef.current) return;

      const statsData = statsRes?.data?.data || {};
      setStats(statsData);

      const logsData = logsRes?.data?.data?.logs || [];
      setRecentActivity(logsData.map((log) => ({
        id: log.id,
        action: humanizeAction(log.action),
        status: (log.status || 'success').toLowerCase(),
        timestamp: log.timestamp,
        user: log.user?.email || 'System',
        resource: log.document?.fileName || 'Platform',
      })));

      const docsSummary = docsRes?.data?.data || {};
      setDocumentSummary({
        totalSize: docsSummary.totalSize || 0,
        totalDownloads: docsSummary.totalDownloads || 0,
      });

    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      if (isMountedRef.current) showToast('Failed to load data', 'error');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
  }, [user, navigate, loadDashboard]);

  const filteredActivity = useMemo(() => {
    if (!searchTerm) return recentActivity;
    const term = searchTerm.toLowerCase();
    return recentActivity.filter((item) =>
      [item.action, item.user, item.resource].some((field) => field?.toLowerCase().includes(term))
    );
  }, [recentActivity, searchTerm]);

  const userStatusData = useMemo(() => [
    { name: 'Active', value: stats.activeUsers },
    { name: 'Locked', value: stats.lockedUsers },
  ], [stats]);

  const storageData = useMemo(() => [
    { name: 'Documents', count: stats.totalDocuments },
    { name: 'Downloads', count: stats.totalDownloads },
    { name: 'Uploads (7d)', count: stats.recentUploads },
  ], [stats]);

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
        <Button variant="outline" size="sm" onClick={loadDashboard}>Refresh</Button>
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <Card.Header><Card.Title>Document Activity</Card.Title></Card.Header>
              <Card.Content className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} 
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header><Card.Title>User Status Distribution</Card.Title></Card.Header>
              <Card.Content className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-sm">
                  {userStatusData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index] }} />
                      <span className="dark:text-slate-300">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
            <Card className="xl:col-span-2">
              <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Card.Title>Recent Activity</Card.Title>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Latest administrative and security events.</p>
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
                {filteredActivity.length === 0 ? (
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
                <div className="mt-4 flex justify-end">
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