import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Cpu, Lock, Eye, EyeOff, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react';
import Secure3DScene from '../components/three/Secure3DScene.jsx';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [focusState, setFocusState] = useState('none');
  const [loginStatus, setLoginStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginStatus('loading');
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setLoginStatus('success');
        setTimeout(() => {
            showToast('Identity Verified. Access Granted.', 'success');
            navigate('/dashboard');
        }, 2500);
      } else {
        setLoginStatus('error');
        setError(result.error);
        showToast('Access Denied: Invalid Credentials', 'error');
        setTimeout(() => setLoginStatus('idle'), 1000);
      }
    } catch (err) {
      setLoginStatus('error');
      setError('Connection Refused.');
      setTimeout(() => setLoginStatus('idle'), 1000);
    }
  };

  return (
    <div className="min-h-screen flex bg-navy-900 text-slate-100 overflow-hidden font-sans selection:bg-cyber selection:text-white">
      
      {/* LEFT: 3D VAULT */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene focusState={focusState} loginStatus={loginStatus} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-navy-900 pointer-events-none" />
        <div className="absolute bottom-10 left-10 font-mono text-xs text-neon-cyan/60 tracking-widest">
          SYSTEM_STATUS: {loginStatus.toUpperCase()}<br/>
          ENCRYPTION: AES-256-GCM<br/>
          ZERO_KNOWLEDGE: ACTIVE
        </div>
      </div>

      {/* RIGHT: UI */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="inline-flex items-center gap-3 mb-2">
               <div className={`p-2.5 rounded-xl bg-cyber/10 border border-cyber/30 transition-all duration-500 ${loginStatus === 'loading' ? 'animate-pulse' : ''}`}>
                  <Shield className="h-8 w-8 text-cyber" />
               </div>
               <span className="text-xl font-bold tracking-wider text-white">SECURE<span className="text-neon-cyan">VAULT</span></span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-sm">Access your encrypted vault securely.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-1 group">
               <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Identity</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Cpu className={`h-5 w-5 transition-colors duration-300 ${focusState === 'email' ? 'text-neon-cyan' : 'text-slate-500'}`} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3.5 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    onFocus={() => setFocusState('email')}
                    onBlur={() => setFocusState('none')}
                  />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Security Key</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors duration-300 ${focusState === 'password' ? 'text-neon-cyan' : 'text-slate-500'}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3.5 pr-12 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    onFocus={() => setFocusState('password')}
                    onBlur={() => setFocusState('none')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
               </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-pulse">
                 <AlertCircle size={16} />
                 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loginStatus === 'loading' || loginStatus === 'success'}
              className={`
                w-full relative overflow-hidden group bg-gradient-to-r from-cyber to-neon-cyan 
                hover:to-neon-cyan text-white font-bold py-4 rounded-xl transition-all duration-300 
                shadow-[0_0_20px_rgba(29,77,240,0.3)] hover:shadow-[0_0_30px_rgba(0,210,255,0.5)]
                disabled:opacity-70 disabled:cursor-not-allowed
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                 {loginStatus === 'loading' ? 'AUTHENTICATING...' : (loginStatus === 'success' ? 'UNLOCKED' : 'SIGN IN')}
                 {loginStatus === 'idle' && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </span>
              <div className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>

            <div className="text-center pt-4">
               <Link 
                 to="/register" 
                 className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-neon-cyan transition-colors"
               >
                 Create secure account <ArrowRight size={14} />
               </Link>
            </div>
          </form>
          
          <div className="pt-8 border-t border-slate-800/50 text-center">
             <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                Zero-Knowledge Encryption • Your Data Stays Yours
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;