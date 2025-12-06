import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { adminAPI } from '../services/api.js';
import { Users, Search, Lock, Unlock, Mail, Calendar, Shield, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';

function UserManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    locked: 0,
    inactive: 0
  });

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') {
      navigate('/dashboard');
      showToast('Access denied: Admin privileges required', 'error');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      const usersData = response.data.data;
      
      setUsers(usersData);
      setStats({
        total: usersData.length,
        active: usersData.filter(u => u.status === 'ACTIVE').length,
        locked: usersData.filter(u => u.status === 'LOCKED').length,
        inactive: usersData.filter(u => u.status === 'INACTIVE').length
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLockUser = async (userId) => {
    try {
      await adminAPI.lockUser(userId);
      showToast('User locked successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to lock user', 'error');
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await adminAPI.unlockUser(userId);
      showToast('User unlocked successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to unlock user', 'error');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const response = await adminAPI.resetPassword(userId);
      showToast('Password reset link generated', 'success');
      console.log('Reset link:', response.data.data.resetLink);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reset password', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-emerald-100 text-emerald-800',
      LOCKED: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-slate-100 text-slate-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      USER: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">User Management</h1>
        <p className="text-sm text-slate-600 sm:text-base">Manage user accounts, roles, and permissions.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading users..." />
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 sm:text-sm">Total Users</p>
                  <p className="text-xl font-bold text-blue-900 sm:text-2xl">{stats.total}</p>
                </div>
                <div className="rounded-lg bg-blue-600 p-3">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 sm:text-sm">Active Users</p>
                  <p className="text-xl font-bold text-emerald-900 sm:text-2xl">{stats.active}</p>
                </div>
                <div className="rounded-lg bg-emerald-600 p-3">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600 sm:text-sm">Locked Accounts</p>
                  <p className="text-xl font-bold text-red-900 sm:text-2xl">{stats.locked}</p>
                </div>
                <div className="rounded-lg bg-red-600 p-3">
                  <Lock className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 sm:text-sm">Inactive Users</p>
                  <p className="text-xl font-bold text-slate-900 sm:text-2xl">{stats.inactive}</p>
                </div>
                <div className="rounded-lg bg-slate-600 p-3">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card padding="sm">
            <Card.Content>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<Search size={18} />}
                    className="w-full sm:w-64"
                  />
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:w-auto"
                  >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="LOCKED">Locked</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Users Table */}
          <Card>
            <Card.Header>
              <Card.Title>All Users ({filteredUsers.length})</Card.Title>
            </Card.Header>
            <Card.Content>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Name</Table.Head>
                    <Table.Head>Email</Table.Head>
                    <Table.Head>Role</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Failed Attempts</Table.Head>
                    <Table.Head>Last Login</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredUsers.map((u) => (
                    <Table.Row key={u.id}>
                      <Table.Cell>
                        <div className="text-sm font-medium text-slate-900 sm:text-base">{u.name}</div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-600 sm:text-sm">{u.email}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        {getRoleBadge(u.role)}
                      </Table.Cell>
                      <Table.Cell>
                        {getStatusBadge(u.status)}
                      </Table.Cell>
                      <Table.Cell>
                        <span className={`text-sm ${u.failedAttempts > 0 ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {u.failedAttempts}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="text-xs text-slate-600 sm:text-sm">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center space-x-2">
                          {u.status === 'LOCKED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlockUser(u.id)}
                              disabled={u.role === 'ADMIN'}
                            >
                              <Unlock size={14} />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLockUser(u.id)}
                              disabled={u.role === 'ADMIN'}
                            >
                              <Lock size={14} />
                            </Button>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="py-10 text-center text-slate-500">
                  <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm sm:text-base">No users found matching your criteria.</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}

export default UserManagement;
