import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-2xl',
    xl: 'max-w-xl sm:max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-3 sm:px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>
        
        <div className={`relative w-full ${sizeClasses[size]} transform rounded-xl bg-white shadow-2xl transition-all`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 sm:px-6">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="p-1 hover:bg-slate-100"
            >
              <X size={18} />
            </Button>
          </div>
          
          <div className="p-5 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;