import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, User, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

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
    <div className="min-h-screen flex bg-white dark:bg-slate-900 transition-colors">
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-blue-900/40 z-0" />
        {/* Decorative Circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 p-12 text-center max-w-lg">
           <div className="mb-8 flex justify-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-900/50">
                 <Shield className="h-12 w-12 text-white" />
              </div>
           </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Secure Vault
          </h2>
          <ul className="text-left space-y-4 text-slate-300 mx-auto max-w-xs">
             <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><Lock size={16} /></div>
                <span>End-to-End Encryption</span>
             </li>
             <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><Shield size={16} /></div>
                <span>PIN Protected Access</span>
             </li>
             <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><User size={16} /></div>
                <span>Secure Account Recovery</span>
             </li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Account</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Start securing your documents today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text" label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon={<User size={18} />}
              required
              placeholder="Your Name"
            />
            <Input
              type="email" label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={18} />}
              required
              placeholder="name@example.com"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={<Lock size={18} />}
                required
                placeholder="Create a strong password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Strength Bar */}
            <div className="flex gap-1 h-1.5 -mt-2">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? (passwordStrength > 2 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
               ))}
            </div>

            <div className="relative">
               <Input
                 type="password" label="Confirm Password"
                 value={formData.confirmPassword}
                 onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                 icon={<Lock size={18} />}
                 required
                 placeholder="Repeat password"
                 className={passMatch && formData.password ? '!border-emerald-500 !focus:ring-emerald-500/20' : ''}
               />
               {passMatch && formData.password && <Check className="absolute right-3 top-9 text-emerald-500 h-5 w-5" />}
            </div>

            {/* PIN Section */}
            <div className="grid grid-cols-2 gap-4">
               <Input
                 type="text" label="6-Digit PIN" maxLength={6}
                 inputMode="numeric"
                 value={formData.pin}
                 onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g,'') })}
                 icon={<Shield size={18} />}
                 required
                 placeholder="######"
               />
               <div className="relative">
                 <Input
                   type="text" label="Confirm PIN" maxLength={6}
                   inputMode="numeric"
                   value={formData.confirmPin}
                   onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g,'') })}
                   icon={<Shield size={18} />}
                   required
                   placeholder="######"
                   className={pinMatch && formData.pin ? '!border-emerald-500 !focus:ring-emerald-500/20' : ''}
                 />
                 {pinMatch && formData.pin && <Check className="absolute right-3 top-9 text-emerald-500 h-5 w-5" />}
               </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <Button 
               type="submit" 
               className="w-full py-3 shadow-lg hover:shadow-xl transition-all duration-200" 
               loading={loading} 
               disabled={!passMatch || !pinMatch || passwordStrength < 1}
            >
              Create Account
            </Button>
          </form>

          <div className="text-center mt-6">
             <Link to="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
               <ArrowLeft size={16} className="mr-1" /> Back to Login
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;