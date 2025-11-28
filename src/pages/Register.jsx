import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { Shield, Mail, Lock, User, ArrowLeft, AlertTriangle, Cpu, Database } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        setError("Encryption keys (passwords) do not match.");
        return;
    }
    setLoading(true);
    try {
      const result = await register({
        name: formData.name, email: formData.email, password: formData.password, pin: formData.pin
      });
      if (result.success) {
        showToast('Identity Key Forged. Proceed to Access Point.', 'success');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError('Registration Failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-space-950 text-white font-sans overflow-hidden">
      
      {/* LEFT: 3D SCENE (Idle) */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene focusState="none" loginStatus="idle" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-space-950 z-10" />
        
        <div className="absolute top-1/2 left-16 transform -translate-y-1/2 z-20 max-w-md">
             <div className="h-0.5 w-12 bg-neon-cyan mb-6" />
             <h2 className="text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
                Initiate <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-cyber">Security Clearance</span>
             </h2>
             <p className="text-slate-400 text-lg leading-relaxed font-light">
                Forge your identity key and encrypt your personal document vault.
             </p>
             
             <div className="mt-10 flex flex-col gap-4">
                 <div className="flex items-center gap-4 p-4 rounded-xl bg-space-900/50 border border-space-800">
                    <div className="p-2 bg-neon-cyan/10 rounded-lg"><Cpu className="text-neon-cyan" size={20} /></div>
                    <div>
                        <h4 className="font-bold text-sm text-white">Cryptographic Identity</h4>
                        <p className="text-xs text-slate-500">Unique hash generation</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 rounded-xl bg-space-900/50 border border-space-800">
                    <div className="p-2 bg-neon-purple/10 rounded-lg"><Database className="text-neon-purple" size={20} /></div>
                    <div>
                        <h4 className="font-bold text-sm text-white">Zero-Knowledge Vault</h4>
                        <p className="text-xs text-slate-500">Client-side encryption</p>
                    </div>
                 </div>
             </div>
        </div>
      </div>

      {/* RIGHT: REGISTER FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-y-auto h-screen relative z-20">
         <div className="w-full max-w-md py-8">
            
            <div className="text-center lg:text-left mb-8">
               <h1 className="text-2xl font-bold text-white">New Operative Registration</h1>
               <p className="text-sm text-slate-500 mt-1">All fields are required for clearance.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold ml-1">Full Name</label>
                  <div className="relative">
                     <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
                     <input type="text" required className="w-full bg-space-900 border border-space-800 rounded-xl p-3.5 pl-12 text-sm text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan focus:outline-none transition-all placeholder:text-slate-700" 
                        placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold ml-1">Email</label>
                  <div className="relative">
                     <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
                     <input type="email" required className="w-full bg-space-900 border border-space-800 rounded-xl p-3.5 pl-12 text-sm text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan focus:outline-none transition-all placeholder:text-slate-700" 
                        placeholder="agent@secure.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold ml-1">Password</label>
                     <div className="relative">
                        <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
                        <input type="password" required className="w-full bg-space-900 border border-space-800 rounded-xl p-3.5 pl-12 text-sm text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan focus:outline-none transition-all" 
                           value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold ml-1">6-Digit PIN</label>
                     <div className="relative">
                        <Shield className="absolute left-4 top-3.5 text-slate-500" size={18} />
                        <input type="text" inputMode="numeric" maxLength={6} required className="w-full bg-space-900 border border-space-800 rounded-xl p-3.5 pl-12 text-sm text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan focus:outline-none transition-all" 
                           value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})}
                        />
                     </div>
                  </div>
               </div>

               {error && (
                 <div className="flex items-center gap-2 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm">
                    <AlertTriangle size={16} /> {error}
                 </div>
               )}

               <button 
                 type="submit"
                 disabled={loading}
                 className="w-full mt-6 bg-gradient-to-r from-cyber to-neon-cyan hover:to-neon-cyan text-white font-bold py-4 rounded-xl shadow-lg shadow-cyber/20 transition-all duration-300 uppercase tracking-widest text-xs"
               >
                 {loading ? 'PROCESSING...' : 'FORGE IDENTITY KEY'}
               </button>
            </form>

            <div className="mt-8 text-center">
               <Link to="/login" className="text-slate-400 text-xs hover:text-white inline-flex items-center gap-2 transition-colors">
                 <ArrowLeft size={12} /> Return to Access Point
               </Link>
            </div>

         </div>
      </div>
    </div>
  );
}

export default Register;