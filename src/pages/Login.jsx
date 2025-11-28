import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, ChevronRight, AlertTriangle, Fingerprint } from 'lucide-react';
import Secure3DScene from '../components/three/Secure3DScene.jsx';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Interaction State for 3D Scene
  const [focusState, setFocusState] = useState('none');
  const [loginStatus, setLoginStatus] = useState('idle'); // idle, loading, success, error
  const [consoleMsg, setConsoleMsg] = useState('AWAITING AUTHORIZATION');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginStatus('loading');
    setConsoleMsg('VERIFYING HASH...');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setLoginStatus('success');
        setConsoleMsg('ACCESS GRANTED. DECRYPTING...');
        setTimeout(() => {
            showToast('Vault Unlocked.', 'success');
            navigate('/dashboard');
        }, 2500); // Wait for 3D unlock animation
      } else {
        setLoginStatus('error');
        setConsoleMsg('ACCESS DENIED. THREAT LOGGED.');
        showToast('Invalid Credentials', 'error');
        setTimeout(() => {
            setLoginStatus('idle');
            setConsoleMsg('AWAITING AUTHORIZATION');
        }, 2000);
      }
    } catch (err) {
      setLoginStatus('error');
      setConsoleMsg('NETWORK FAILURE');
      setTimeout(() => setLoginStatus('idle'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex bg-space-950 text-white font-sans selection:bg-neon-cyan selection:text-black overflow-hidden">
      
      {/* LEFT PANEL: 3D SCENE */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene focusState={focusState} loginStatus={loginStatus} />
        
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#02040a_120%)] opacity-80 pointer-events-none" />
        
        {/* Console HUD */}
        <div className="absolute bottom-10 left-10 font-mono text-[10px] text-neon-cyan/70 tracking-widest border-l-2 border-neon-cyan pl-4 space-y-1">
          <p>STATUS: <span className={loginStatus === 'error' ? 'text-neon-red' : 'text-white'}>{consoleMsg}</span></p>
          <p>SECURE_LINK: <span className="text-neon-green">ACTIVE</span></p>
          <p>VAULT_ID: OMEGA-7</p>
          <p className="opacity-50">ENCRYPTION: AES-256-GCM</p>
        </div>
      </div>

      {/* RIGHT PANEL: LOGIN UI */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-neon-cyan mb-4">
                <Shield size={24} />
                <span className="text-xs font-bold tracking-[0.3em] uppercase">Secure Document Vault</span>
             </div>
             <h1 className="text-4xl font-bold text-white tracking-tight">Enter the Vault</h1>
             <p className="text-slate-400 text-sm">Align your encrypted assets to unlock access.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            
            {/* Email */}
            <div className="space-y-1">
               <label className="text-[10px] font-medium text-neon-cyan uppercase tracking-wider ml-1">Operative ID</label>
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Fingerprint className={`h-5 w-5 transition-colors duration-300 ${focusState === 'email' ? 'text-neon-cyan' : 'text-slate-600'}`} />
                  </div>
                  <input
                    type="email" required
                    className="w-full bg-space-900 border border-space-800 text-white text-sm rounded-xl block w-full pl-12 p-4 focus:ring-1 focus:ring-neon-cyan focus:border-neon-cyan transition-all placeholder:text-slate-700"
                    placeholder="operative@agency.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    onFocus={() => { setFocusState('email'); setConsoleMsg('SCANNING ID...'); }}
                    onBlur={() => { setFocusState('none'); setConsoleMsg('AWAITING AUTHORIZATION'); }}
                  />
               </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
               <label className="text-[10px] font-medium text-neon-cyan uppercase tracking-wider ml-1">Encryption Key</label>
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors duration-300 ${focusState === 'password' ? 'text-neon-cyan' : 'text-slate-600'}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"} required
                    className="w-full bg-space-900 border border-space-800 text-white text-sm rounded-xl block w-full pl-12 p-4 pr-12 focus:ring-1 focus:ring-neon-cyan focus:border-neon-cyan transition-all placeholder:text-slate-700"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    onFocus={() => { setFocusState('password'); setConsoleMsg('ENGAGING LOCK MECHANISM...'); }}
                    onBlur={() => { setFocusState('none'); setConsoleMsg('AWAITING AUTHORIZATION'); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
               </div>
            </div>

            <button
              type="submit"
              disabled={loginStatus === 'loading' || loginStatus === 'success'}
              className={`
                w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300 relative overflow-hidden group
                ${loginStatus === 'success' ? 'bg-neon-green text-space-950' : 'bg-cyber hover:bg-cyber-glow text-white'}
                disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyber/20 hover:shadow-cyber/40
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                 {loginStatus === 'loading' ? 'DECRYPTING...' : (loginStatus === 'success' ? 'ACCESS GRANTED' : 'UNLOCK VAULT')}
                 {loginStatus === 'idle' && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="pt-8 text-center border-t border-space-800/50">
             <Link to="/register" className="text-slate-500 text-xs hover:text-neon-cyan transition-colors inline-flex items-center gap-2">
               No identity key? <span className="underline underline-offset-4 text-slate-300 hover:text-white">Initiate Clearance</span>
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;