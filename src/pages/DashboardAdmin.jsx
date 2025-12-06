import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  UploadCloud,
} from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { adminAPI } from '../services/api.js';

const humanizeAction = (value = '') =>
  value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatTimestamp = (value) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
};

const getTimestampParts = (value) => {
  if (!value) {
    return { date: 'Unknown', time: '' };
  }

  const date = new Date(value);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  const precision = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[index]}`;
};

const formatNumber = (value = 0) => Number(value || 0).toLocaleString();

const getStatusBadge = (status) => {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Unknown
      </span>
    );
  }

  let normalized = status.toLowerCase();
  if (normalized === 'failed') normalized = 'failure';

  const styles = {
    success: 'bg-emerald-100 text-emerald-700',
    failure: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    default: 'bg-slate-100 text-slate-600',
  };

  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  const classes = styles[normalized] || styles.default;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
};

const getActivityIcon = (status) => {
  const normalized = status?.toLowerCase();

  if (normalized === 'success') {
    return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  }

  if (normalized === 'failure' || normalized === 'failed') {
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  }

  if (normalized === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }

  return <Activity className="h-4 w-4 text-blue-600" />;
};

function DashboardAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    totalDocuments: 0,
    totalDownloads: 0,
    recentUploads: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentSummary, setDocumentSummary] = useState({
    totalSize: 0,
    totalDownloads: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);

    try {
      // Fetch stats, recent audit logs, and document snapshot concurrently for faster loading.
      const [statsRes, logsRes, docsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getLogs({ limit: 12 }),
        adminAPI.getAllDocuments({ limit: 8 }),
      ]);

      if (!isMountedRef.current) return;

      const statsData = statsRes?.data?.data || {};
      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        lockedUsers: statsData.lockedUsers || 0,
        totalDocuments: statsData.totalDocuments || 0,
        totalDownloads: statsData.totalDownloads || 0,
        recentUploads: statsData.recentUploads || 0,
      });

      const logsData = logsRes?.data?.data?.logs || [];
      setRecentActivity(
        logsData.map((log) => ({
          id: log.id || log._id,
          action: humanizeAction(log.action),
          status: (log.status || 'success').toLowerCase(),
          timestamp: log.timestamp,
          user: log.user?.email || 'System',
          resource: log.document?.fileName || 'Platform',
        }))
      );

      const docsData = docsRes?.data?.data || {};
      setDocuments(
        (docsData.documents || []).map((doc) => ({
          id: doc.id,
          name: doc.fileName,
          owner: doc.owner?.email || 'Unknown',
          size: doc.fileSize || 0,
          downloads: doc.downloadCount || 0,
          uploadedAt: doc.createdAt,
        }))
      );
      setDocumentSummary({
        totalSize: docsData.totalSize || 0,
        totalDownloads: docsData.totalDownloads || 0,
      });
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      if (isMountedRef.current) {
        showToast('Failed to load admin dashboard data', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) return;

    if (user.role?.toUpperCase() !== 'ADMIN') {
      showToast('Access denied: Admin privileges required', 'error');
      navigate('/dashboard');
      return;
    }

    loadDashboard();
  }, [user, navigate, showToast, loadDashboard]);

  const filteredActivity = useMemo(() => {
    if (!searchTerm) {
      return recentActivity;
    }

    const term = searchTerm.toLowerCase();
    return recentActivity.filter((item) =>
      [item.action, item.user, item.resource].some((field) => field?.toLowerCase().includes(term))
    );
  }, [recentActivity, searchTerm]);

  const handleViewLogs = () => navigate('/audit-logs');
  const handleManageUsers = () => navigate('/users');
  const handleViewDocuments = () => navigate('/documents');
  const handleRefresh = () => loadDashboard();

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Monitor user activity, document usage, and platform security at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleManageUsers}>
            <Users className="h-4 w-4" />
            <span>Manage Users</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={handleViewLogs}>
            <Activity className="h-4 w-4" />
            <span>Audit Logs</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading admin overview..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 sm:text-sm">Total Users</p>
                  <p className="text-xl font-bold text-blue-900 sm:text-2xl">{formatNumber(stats.totalUsers)}</p>
                </div>
                <div className="rounded-lg bg-blue-600 p-2.5">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 sm:text-sm">Active Users</p>
                  <p className="text-xl font-bold text-emerald-900 sm:text-2xl">{formatNumber(stats.activeUsers)}</p>
                </div>
                <div className="rounded-lg bg-emerald-600 p-2.5">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 sm:text-sm">Locked Accounts</p>
                  <p className="text-xl font-bold text-red-900 sm:text-2xl">{formatNumber(stats.lockedUsers)}</p>
                </div>
                <div className="rounded-lg bg-red-600 p-2.5">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 sm:text-sm">Total Documents</p>
                  <p className="text-xl font-bold text-purple-900 sm:text-2xl">{formatNumber(stats.totalDocuments)}</p>
                </div>
                <div className="rounded-lg bg-purple-600 p-2.5">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-600 sm:text-sm">Total Downloads</p>
                  <p className="text-xl font-bold text-indigo-900 sm:text-2xl">{formatNumber(stats.totalDownloads)}</p>
                </div>
                <div className="rounded-lg bg-indigo-600 p-2.5">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 sm:text-sm">Uploads (7 days)</p>
                  <p className="text-xl font-bold text-amber-900 sm:text-2xl">{formatNumber(stats.recentUploads)}</p>
                </div>
                <div className="rounded-lg bg-amber-600 p-2.5">
                  <UploadCloud className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
            <Card className="xl:col-span-2">
              <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Card.Title>Recent Activity</Card.Title>
                  <p className="text-xs text-slate-500 sm:text-sm">Latest administrative and security events.</p>
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
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No activity found for the selected filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-white p-1.5 shadow-inner">
                            {getActivityIcon(item.status)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.action}</p>
                            <p className="text-xs text-slate-500">
                              {item.user}
                              {item.resource ? ` • ${item.resource}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1 sm:items-end">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatTimestamp(item.timestamp)}</span>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleViewLogs}>
                    View Audit Logs
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleViewDocuments}>
                    View All Documents
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
                    <span className="text-slate-500">Storage Used</span>
                    <span className="font-semibold text-slate-900">{formatBytes(documentSummary.totalSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Downloads</span>
                    <span className="font-semibold text-slate-900">{formatNumber(documentSummary.totalDownloads)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Uploads (7 days)</span>
                    <span className="font-semibold text-slate-900">{formatNumber(stats.recentUploads)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Locked Accounts</span>
                    <span className="font-semibold text-slate-900">{formatNumber(stats.lockedUsers)}</span>
                  </div>
                </Card.Content>
              </Card>

              <Card padding="sm">
                <Card.Header className="mb-2">
                  <Card.Title>Quick Actions</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleManageUsers}
                  >
                    <Users className="h-4 w-4" />
                    <span>Manage Users</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleViewDocuments}
                  >
                    <FileText className="h-4 w-4" />
                    <span>All Documents</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleViewLogs}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Audit Logs</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Shield className="h-4 w-4" />
                    <span>User Dashboard</span>
                  </Button>
                </Card.Content>
              </Card>
            </div>
          </div>

          <Card>
            <Card.Header className="flex flex-col gap-1">
              <Card.Title>Recent Documents</Card.Title>
              <p className="text-xs text-slate-500 sm:text-sm">Snapshot of the latest uploads across the platform.</p>
            </Card.Header>
            <Card.Content>
              <div className="hidden lg:block">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Document</Table.Head>
                      <Table.Head>Owner</Table.Head>
                      <Table.Head>Size</Table.Head>
                      <Table.Head>Downloads</Table.Head>
                      <Table.Head>Uploaded</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {documents.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5} className="py-8 text-center">
                          <p className="text-sm text-slate-500">No documents available yet.</p>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      documents.map((doc) => {
                        const { date, time } = getTimestampParts(doc.uploadedAt);

                        return (
                          <Table.Row key={doc.id}>
                            <Table.Cell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-slate-900">{doc.name}</span>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-slate-600">{doc.owner}</span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-slate-600">{formatBytes(doc.size)}</span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-slate-600">{formatNumber(doc.downloads)}</span>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-col text-xs text-slate-500 sm:text-sm">
                                <span className="font-medium text-slate-900">{time}</span>
                                <span>{date}</span>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })
                    )}
                  </Table.Body>
                </Table>
              </div>

              <div className="grid gap-3 lg:hidden">
                {documents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No documents available yet.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const { date, time } = getTimestampParts(doc.uploadedAt);

                    return (
                      <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">{doc.owner}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            {formatBytes(doc.size)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{date}</span>
                          <span>{time}</span>
                          <span>{formatNumber(doc.downloads)} downloads</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}

export default DashboardAdmin;