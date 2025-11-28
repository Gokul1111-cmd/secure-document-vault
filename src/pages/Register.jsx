import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { User, Mail, Lock, Shield, ArrowLeft, Disc } from 'lucide-react';
import Secure3DScene from '../components/three/Secure3DScene.jsx';

function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register({
        name: formData.name, email: formData.email, password: formData.password, pin: formData.pin
      });
      if (result.success) {
        showToast('Identity Key Forged. Proceed to Access Point.', 'success');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        showToast(result.error, 'error');
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-space-900 text-white font-sans overflow-hidden">
      
      {/* LEFT: 3D SCENE (Idle mode for registration background) */}
      <div className="hidden lg:block lg:w-1/2 relative h-screen">
        <Secure3DScene focusState="none" loginStatus="idle" emailInput={formData.email} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-space-900 z-10" />
        
        <div className="absolute top-1/2 left-12 transform -translate-y-1/2 z-20 max-w-md">
             <h2 className="text-4xl font-bold text-white mb-4">Forge Your <br/><span className="text-neon-cyan">Star-Key</span></h2>
             <p className="text-slate-400 text-lg">
                Your email creates a unique cryptographic signature in our constellation. This key is yours alone.
             </p>
             <div className="mt-8 flex gap-4">
                 <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <Disc className="text-neon-cyan mb-1" />
                    <span className="text-xs text-slate-300">Unique Geometry</span>
                 </div>
                 <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <Shield className="text-neon-cyan mb-1" />
                    <span className="text-xs text-slate-300">Zero-Knowledge</span>
                 </div>
             </div>
        </div>
      </div>

      {/* RIGHT: REGISTER FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-y-auto h-screen relative z-20">
         <div className="w-full max-w-md bg-space-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
            
            <div className="text-center mb-6">
               <h1 className="text-2xl font-bold text-white">Initiate Clearance</h1>
               <p className="text-sm text-slate-500">Create your secure identity.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold">Operative Name</label>
                  <div className="relative">
                     <User className="absolute left-3 top-3 text-slate-500" size={16} />
                     <input type="text" required className="w-full bg-space-900/50 border border-white/10 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-neon-cyan focus:outline-none" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold">Email Identity</label>
                  <div className="relative">
                     <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                     <input type="email" required className="w-full bg-space-900/50 border border-white/10 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-neon-cyan focus:outline-none" 
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold">Password</label>
                     <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input type="password" required className="w-full bg-space-900/50 border border-white/10 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-neon-cyan focus:outline-none" 
                           value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-neon-cyan uppercase tracking-wider font-bold">6-Digit PIN</label>
                     <div className="relative">
                        <Shield className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input type="text" inputMode="numeric" maxLength={6} required className="w-full bg-space-900/50 border border-white/10 rounded-lg p-2.5 pl-10 text-sm text-white focus:border-neon-cyan focus:outline-none" 
                           value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})}
                        />
                     </div>
                  </div>
               </div>

               <button 
                 type="submit"
                 disabled={loading}
                 className="w-full mt-4 bg-gradient-to-r from-cyber to-neon-cyan text-black font-bold py-3 rounded-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all"
               >
                 {loading ? 'Forging Identity...' : 'Forge Star-Key'}
               </button>
            </form>

            <div className="mt-6 text-center">
               <Link to="/login" className="text-slate-400 text-xs hover:text-white inline-flex items-center gap-1">
                 <ArrowLeft size={12} /> Return to Access Point
               </Link>
            </div>

         </div>
      </div>
    </div>
  );
}

export default Register;