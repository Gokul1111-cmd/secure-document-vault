import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Cpu } from 'lucide-react';
import Secure3DScene from '../components/three/Secure3DScene.jsx';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await register({
        name: formData.name, email: formData.email, password: formData.password, pin: formData.pin
      });
      if (result.success) {
        showToast('Clearance Granted. Proceed to Login.', 'success');
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
    <div className="min-h-screen flex bg-navy-900 text-slate-100 overflow-hidden font-sans selection:bg-cyber selection:text-white">
      
      {/* LEFT: 3D VAULT */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene focusState="none" loginStatus="idle" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-navy-900 pointer-events-none" />
        <div className="absolute bottom-10 left-10 font-mono text-xs text-neon-cyan/60 tracking-widest">
          INITIALIZING_NEW_USER<br/>
          KEY_GENERATION: PENDING
        </div>
      </div>

      {/* RIGHT: UI */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white tracking-tight">New Operative</h1>
            <p className="text-slate-400 text-sm mt-2">Establish your cryptographic identity.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1">
               <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Full Name</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text" required
                    className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Email Identity</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email" required
                    className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                    placeholder="agent@secure.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Security Key</label>
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} required
                    className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3 pr-12 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                    placeholder="Strong Password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">6-Digit PIN</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                       <Shield className="h-5 w-5 text-slate-500" />
                     </div>
                     <input
                       type="text" maxLength={6} required inputMode="numeric"
                       className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                       placeholder="######"
                       value={formData.pin}
                       onChange={(e) => setFormData({...formData, pin: e.target.value})}
                     />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider ml-1">Confirm PIN</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                       <Shield className="h-5 w-5 text-slate-500" />
                     </div>
                     <input
                       type="text" maxLength={6} required inputMode="numeric"
                       className="w-full bg-navy-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-12 p-3 focus:ring-2 focus:ring-cyber focus:border-cyber transition-all placeholder:text-slate-600"
                       placeholder="######"
                       value={formData.confirmPin}
                       onChange={(e) => setFormData({...formData, confirmPin: e.target.value})}
                     />
                  </div>
               </div>
            </div>

            {error && <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyber to-neon-cyan hover:to-neon-cyan text-white font-bold py-4 rounded-xl shadow-lg shadow-cyber/30 transition-all duration-300 mt-4"
            >
              {loading ? 'INITIALIZING...' : 'ESTABLISH IDENTITY'}
            </button>
          </form>

          <div className="text-center mt-6">
             <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-neon-cyan transition-colors">
               <ArrowLeft size={14} /> Return to Access Point
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;