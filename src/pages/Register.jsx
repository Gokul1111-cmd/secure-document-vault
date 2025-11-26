import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Card from '../components/ui/Card.jsx';

function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(formData.pin)) {
      setError('PIN must be exactly 6 digits');
      setLoading(false);
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        pin: formData.pin
      });
      if (result.success) {
        showToast('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(result.error || 'Registration failed');
        showToast(result.error || 'Registration failed', 'error');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      showToast('Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-600">Join our secure document vault platform</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon={<User size={18} />}
              required
              placeholder="John Doe"
            />

            <Input
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={18} />}
              required
              placeholder="john@example.com"
            />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={<Lock size={18} />}
                required
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                icon={<Lock size={18} />}
                required
                placeholder="Repeat your password"
              />
              <button
                type="button"
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Input
              type="text"
              label="6-Digit PIN"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/[^0-9]/g,'') })}
              icon={<Shield size={18} />}
              required
              placeholder="e.g. 123456"
              maxLength={6}
            />

            <Input
              type="text"
              label="Confirm PIN"
              value={formData.confirmPin}
              onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/[^0-9]/g,'') })}
              icon={<Shield size={18} />}
              required
              placeholder="Repeat PIN"
              maxLength={6}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              size="lg"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Register;