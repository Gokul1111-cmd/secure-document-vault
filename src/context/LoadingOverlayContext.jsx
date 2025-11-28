import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LoadingOverlayContext = createContext(null);

export function useLoadingOverlay() {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error('useLoadingOverlay must be used within a LoadingOverlayProvider');
  }
  return context;
}

export function LoadingOverlayProvider({ children }) {
  const [state, setState] = useState({ isVisible: false, message: '', counter: 0 });

  const showLoading = useCallback((message = '') => {
    setState((prev) => ({
      counter: prev.counter + 1,
      isVisible: true,
      message: message || prev.message,
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setState((prev) => {
      const nextCounter = Math.max(prev.counter - 1, 0);
      return {
        counter: nextCounter,
        isVisible: nextCounter > 0,
        message: nextCounter === 0 ? '' : prev.message,
      };
    });
  }, []);

  const withLoading = useCallback(
    async (operation, message = '') => {
      showLoading(message);
      try {
        return await operation();
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const value = useMemo(
    () => ({
      isLoading: state.isVisible,
      message: state.message,
      showLoading,
      hideLoading,
      withLoading,
    }),
    [state.isVisible, state.message, showLoading, hideLoading, withLoading]
  );

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
    </LoadingOverlayContext.Provider>
  );
}
