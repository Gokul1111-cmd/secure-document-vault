import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { adminAPI } from '../services/api.js';
import { Activity, Search, Filter, Download, Calendar, User, Globe, Shield } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

function AuditLogs() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    uniqueUsers: 0
  });

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'admin') {
      navigate('/dashboard');
      showToast('Access denied: Admin privileges required', 'error');
      return;
    }
    fetchAuditLogs();
  }, [user, filterStatus]);

  const fetchAuditLogs = async () => {
    try {
      // Fetch real audit logs from API
      const params = { limit: 1000 };
      if (filterStatus !== 'all') params.status = filterStatus.toUpperCase();
      
      const response = await adminAPI.getLogs(params);
      const logsData = response.data.data.logs.map(log => ({
        id: log.id,
        action: log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        user: log.user?.email || 'System',
        resource: log.document?.fileName || 'Auth System',
        timestamp: log.timestamp,
        ipAddress: log.ipAddr || 'N/A',
        userAgent: log.userAgent || 'Unknown',
        status: log.status.toLowerCase()
      }));
      
      setLogs(logsData);
      setStats({
        total: logsData.length,
        successful: logsData.filter(l => l.status === 'success').length,
        failed: logsData.filter(l => l.status === 'failure').length,
        uniqueUsers: new Set(logsData.map(l => l.user)).size
      });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getActionIcon = (action) => {
    if (action.includes('Download')) return <Download size={16} className="text-blue-600" />;
    if (action.includes('Upload')) return <Activity size={16} className="text-emerald-600" />;
    if (action.includes('Login')) return <User size={16} className="text-purple-600" />;
    if (action.includes('Role')) return <Shield size={16} className="text-amber-600" />;
    return <Activity size={16} className="text-slate-600" />;
  };

  const exportLogs = () => {
    const csv = [
      ['Action', 'User', 'Resource', 'Timestamp', 'IP Address', 'Status'].join(','),
      ...filteredLogs.map(log => 
        [log.action, log.user, log.resource, log.timestamp, log.ipAddress, log.status].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Audit logs exported successfully', 'success');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Audit Logs</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">Monitor system activity and security events.</p>
        </div>
        <Button onClick={exportLogs} className="flex items-center space-x-2" size="md">
          <Download size={18} />
          <span>Export Logs</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading audit logs..." />
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-500/20 dark:to-blue-500/5 dark:border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-200 sm:text-sm">Total Events</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100 sm:text-2xl">{stats.total}</p>
                </div>
                <div className="rounded-lg bg-blue-600 p-3">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-200 sm:text-sm">Successful Actions</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 sm:text-2xl">{stats.successful}</p>
                </div>
                <div className="rounded-lg bg-emerald-600 p-3">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-500/20 dark:to-red-500/5 dark:border-red-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-200 sm:text-sm">Failed Attempts</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-100 sm:text-2xl">{stats.failed}</p>
                </div>
                <div className="rounded-lg bg-red-600 p-3">
                  <Globe className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 dark:from-purple-500/20 dark:to-purple-600/5 dark:border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-200 sm:text-sm">Unique Users</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100 sm:text-2xl">{stats.uniqueUsers}</p>
                </div>
                <div className="rounded-lg bg-purple-600 p-3">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          </div>

      {/* Filters and Search */}
      <Card padding="sm">
        <Card.Content>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:w-auto"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="warning">Warning</option>
              </select>

              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:w-auto"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="flex w-full items-center justify-end sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Filter size={16} />
                <span className="ml-2">More Filters</span>
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <Card.Header>
          <Card.Title>Activity Logs ({filteredLogs.length} events)</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Action</Table.Head>
                <Table.Head>User</Table.Head>
                <Table.Head>Resource</Table.Head>
                <Table.Head>Timestamp</Table.Head>
                <Table.Head>IP Address</Table.Head>
                <Table.Head>User Agent</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredLogs.map((log) => (
                <Table.Row key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">{log.action}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-sm font-medium text-slate-900 dark:text-white sm:text-base">{log.user}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">{log.resource}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatTimestamp(log.timestamp).split(',')[1]}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {formatTimestamp(log.timestamp).split(',')[0]}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <code className="text-xs bg-slate-100 dark:bg-slate-800/70 px-2 py-1 rounded">
                      {log.ipAddress}
                    </code>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm max-w-32 truncate block">
                      {log.userAgent}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {getStatusBadge(log.status)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400">
              <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm sm:text-base">No audit logs found matching your criteria.</p>
            </div>
          )}
        </Card.Content>
      </Card>
        </>
      )}
    </div>
  );
}

export default AuditLogs;