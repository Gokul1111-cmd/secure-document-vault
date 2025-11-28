import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500" />,
  };

  const backgrounds = {
    success: 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20',
    error: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg ${backgrounds[type]} animate-slide-in`}>
      {icons[type]}
      <p className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-50">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default Toast;
