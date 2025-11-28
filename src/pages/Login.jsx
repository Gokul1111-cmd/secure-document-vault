import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Disc, Globe } from 'lucide-react'; // Icons
import Secure3DScene from '../components/three/Secure3DScene.jsx';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Interaction States
  const [focusState, setFocusState] = useState('none');
  const [loginStatus, setLoginStatus] = useState('idle'); // idle, success, error
  const [uiMessage, setUiMessage] = useState('Awaiting Authorization...');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiMessage('Verifying Star-Key...');
    
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setLoginStatus('success');
        setUiMessage('Constellation Aligned. Access Granted.');
        
        // Wait for animation
        setTimeout(() => {
            showToast('Welcome to the Observatory.', 'success');
            navigate('/dashboard');
        }, 2000);
      } else {
        setLoginStatus('error');
        setUiMessage('Authorization Denied. Threat Logged.');
        showToast('Invalid Credentials', 'error');
        setTimeout(() => {
            setLoginStatus('idle');
            setUiMessage('Awaiting Authorization...');
        }, 1500);
      }
    } catch (err) {
      setLoginStatus('error');
      setUiMessage('Connection Lost.');
    }
  };

  return (
    <div className="min-h-screen flex bg-space-900 text-white font-sans selection:bg-neon-cyan selection:text-black overflow-hidden">
      
      {/* LEFT: 3D SCENE */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene 
            focusState={focusState} 
            loginStatus={loginStatus} 
            emailInput={formData.email} 
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-space-900 z-10" />
        
        {/* Status HUD */}
        <div className="absolute bottom-8 left-8 z-20 font-mono text-xs text-neon-cyan/70 tracking-widest border-l-2 border-neon-cyan pl-3">
            <p>STATUS: {uiMessage.toUpperCase()}</p>
            <p>SECURE_LINK: ACTIVE</p>
            <p>VAULT_ID: OMEGA-7</p>
        </div>
      </div>

      {/* RIGHT: UI CARD */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-20">
         {/* Background Stars (CSS) for mobile */}
         <div className="lg:hidden absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

         <div className="w-full max-w-md bg-space-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            
            {/* Glowing Top Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50"></div>

            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2 text-neon-cyan">
                    <Globe size={20} className="animate-spin-slow" />
                    <span className="text-xs font-bold tracking-[0.2em] uppercase">Observatory Access</span>
                </div>
                <h1 className="text-3xl font-bold text-white">Enter the Vault</h1>
                <p className="text-slate-400 text-sm mt-2">Align your Star-Key to unlock documents.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Email Input */}
                <div className="group">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Operative ID</label>
                    <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-neon-cyan transition-colors">
                            <Mail size={18} />
                        </div>
                        <input 
                            type="email" 
                            required
                            className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                            placeholder="name@constellation.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            onFocus={() => { setFocusState('email'); setUiMessage('Calling Constellation...'); }}
                            onBlur={() => { setFocusState('none'); setUiMessage('Awaiting Authorization...'); }}
                        />
                    </div>
                </div>

                {/* Password Input */}
                <div className="group">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Encryption Key</label>
                    <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-neon-cyan transition-colors">
                            <Lock size={18} />
                        </div>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required
                            className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            onFocus={() => { setFocusState('password'); setUiMessage('Forging Star-Key...'); }}
                            onBlur={() => { setFocusState('none'); setUiMessage('Awaiting Authorization...'); }}
                        />
                        <button 
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                        >
                           {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-right mt-1 text-neon-cyan/80 cursor-pointer hover:text-neon-cyan">Lost your key?</p>
                </div>

                {/* CTA Button */}
                <button 
                    type="submit"
                    disabled={loginStatus === 'loading' || loginStatus === 'success'}
                    className={`
                        w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all duration-300 relative overflow-hidden group
                        ${loginStatus === 'success' ? 'bg-green-500 text-black' : 'bg-neon-cyan text-black hover:bg-cyan-300'}
                        disabled:opacity-70 disabled:cursor-not-allowed
                    `}
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {loginStatus === 'loading' ? 'Verifying...' : (loginStatus === 'success' ? 'Access Granted' : 'Decrypt & Enter')}
                        {loginStatus === 'idle' && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                    </span>
                    {/* Sweep Effect */}
                    <div className="absolute inset-0 bg-white/40 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                </button>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-slate-400 text-xs mb-2">New to the network?</p>
                <Link to="/register" className="text-neon-cyan text-sm font-medium hover:text-cyan-300 inline-flex items-center gap-1 group">
                    Initiate Security Clearance <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </Link>
            </div>

         </div>
      </div>
    </div>
  );
}

export default Login;