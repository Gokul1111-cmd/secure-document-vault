import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Card from '../components/ui/Card.jsx';

function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation States
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passMatch, setPassMatch] = useState(false);
  const [pinMatch, setPinMatch] = useState(false);

  useEffect(() => {
    // Password Strength
    let strength = 0;
    if (formData.password.length >= 6) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
    setPasswordStrength(strength);

    setPassMatch(formData.password && formData.password === formData.confirmPassword);
    setPinMatch(formData.pin && formData.pin.length === 6 && formData.pin === formData.confirmPin);
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passMatch || !pinMatch || passwordStrength < 1) return;
    setLoading(true);
    setError('');
    try {
      const result = await register({
        name: formData.name, email: formData.email, password: formData.password, pin: formData.pin
      });
      if (result.success) {
        showToast('Registration successful! Login now.', 'success');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 dark:bg-slate-900 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-slate-600 dark:text-slate-400">Secure your digital assets today</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text" label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon={<User size={18} />}
              required
            />
            <Input
              type="email" label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={18} />}
              required
            />

            {/* Password Field */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={<Lock size={18} />}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Strength Indicator */}
            <div className="flex gap-1 h-1.5 mt-1">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className={`flex-1 rounded-full transition-colors ${i < passwordStrength ? (passwordStrength > 2 ? 'bg-green-500' : 'bg-yellow-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
               ))}
            </div>

            <div className="relative">
               <Input
                 type="password" label="Confirm Password"
                 value={formData.confirmPassword}
                 onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                 icon={<Lock size={18} />}
                 required
                 className={passMatch ? 'border-green-500 focus:border-green-500' : ''}
               />
               {passMatch && <Check className="absolute right-3 top-9 text-green-500 h-5 w-5" />}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Input
                 type="text" label="6-Digit PIN" maxLength={6}
                 value={formData.pin}
                 onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g,'') })}
                 icon={<Shield size={18} />}
                 required
               />
               <div className="relative">
                 <Input
                   type="text" label="Confirm PIN" maxLength={6}
                   value={formData.confirmPin}
                   onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g,'') })}
                   icon={<Shield size={18} />}
                   required
                   className={pinMatch ? 'border-green-500 focus:border-green-500' : ''}
                 />
                 {pinMatch && <Check className="absolute right-3 top-9 text-green-500 h-5 w-5" />}
               </div>
            </div>

            {error && <div className="bg-red-50 border-red-200 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full" loading={loading} disabled={!passMatch || !pinMatch}>
              Sign Up
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
             <Link to="/login" className="text-blue-600 hover:underline font-medium">Already have an account? Sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Register;