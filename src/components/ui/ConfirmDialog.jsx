import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
          {danger && (
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base flex-1 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button
            onClick={handleConfirm}
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
          >
            {confirmText}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
