import LoadingSpinner from './LoadingSpinner.jsx';
import { useLoadingOverlay } from '../../context/LoadingOverlayContext.jsx';

function LoadingOverlay() {
  const { isLoading, message } = useLoadingOverlay();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center rounded-xl bg-white/90 px-6 py-5 shadow-xl">
        <LoadingSpinner size="lg" />
        {message ? (
          <p className="mt-3 text-sm font-medium text-slate-700">{message}</p>
        ) : (
          <p className="mt-3 text-sm font-medium text-slate-700">Please wait...</p>
        )}
      </div>
    </div>
  );
}

export default LoadingOverlay;
