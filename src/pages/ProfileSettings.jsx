import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { authAPI } from '../services/api.js';
import { User, Mail, Lock, Shield, Calendar, Save } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

function ProfileSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authAPI.updateProfile({
        name: formData.name,
        email: formData.email
      });
      
      // Update user in local storage
      const updatedUser = response.data.data;
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = { ...currentUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(newUser));
      
      showToast('Profile updated successfully', 'success');
      
      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      showToast('Password changed successfully', 'success');
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = async (e) => {
    e.preventDefault();
    
    if (!/^\d{6}$/.test(formData.newPin)) {
      showToast('PIN must be exactly 6 digits', 'error');
      return;
    }
    
    if (formData.newPin !== formData.confirmPin) {
      showToast('PINs do not match', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.updatePin({
        currentPin: formData.currentPin,
        newPin: formData.newPin
      });
      
      showToast('PIN changed successfully', 'success');
      setFormData({ ...formData, currentPin: '', newPin: '', confirmPin: '' });
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change PIN', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl lg:space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Profile Settings</h1>
        <p className="text-sm text-slate-600 sm:text-base">Manage your account settings and security preferences.</p>
      </div>

      {/* User Info Card */}
      <Card>
        <Card.Header>
          <Card.Title>Account Information</Card.Title>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleProfileUpdate} className="space-y-5 sm:space-y-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-xl font-semibold text-white sm:h-16 sm:w-16 sm:text-2xl">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{user?.name}</h3>
                <p className="text-xs text-slate-600 sm:text-sm">{user?.email}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">Role: {user?.role?.toLowerCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                icon={<User size={18} />}
                placeholder="Your full name"
              />
              
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={<Mail size={18} />}
                placeholder="your@email.com"
                disabled
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Member Since</p>
                  <p className="text-xs text-slate-600">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={loading} className="flex items-center space-x-2">
                <Save size={18} />
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Change Password */}
      <Card>
        <Card.Header>
          <Card.Title>Change Password</Card.Title>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handlePasswordChange} className="space-y-5 sm:space-y-6">
            <Input
              label="Current Password"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              icon={<Lock size={18} />}
              placeholder="Enter current password"
            />
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                icon={<Lock size={18} />}
                placeholder="Minimum 6 characters"
              />
              
              <Input
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                icon={<Lock size={18} />}
                placeholder="Repeat new password"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Update Password
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Change PIN */}
      <Card>
        <Card.Header>
          <Card.Title>Change Document Access PIN</Card.Title>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handlePinChange} className="space-y-5 sm:space-y-6">
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start space-x-3">
                <Shield className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Security Notice</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Your PIN is used to view and download documents. Keep it secure and different from your password.
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Current PIN"
              type="text"
              maxLength={6}
              value={formData.currentPin}
              onChange={(e) => setFormData({ ...formData, currentPin: e.target.value.replace(/[^0-9]/g, '') })}
              icon={<Shield size={18} />}
              placeholder="Current 6-digit PIN"
            />
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="New PIN"
                type="text"
                maxLength={6}
                value={formData.newPin}
                onChange={(e) => setFormData({ ...formData, newPin: e.target.value.replace(/[^0-9]/g, '') })}
                icon={<Shield size={18} />}
                placeholder="New 6-digit PIN"
              />
              
              <Input
                label="Confirm New PIN"
                type="text"
                maxLength={6}
                value={formData.confirmPin}
                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/[^0-9]/g, '') })}
                icon={<Shield size={18} />}
                placeholder="Repeat new PIN"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Update PIN
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>


    </div>
  );
}

export default ProfileSettings;
