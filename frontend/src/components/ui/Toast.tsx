import React, { createContext, useCallback, useContext, useState } from 'react';
import { X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const variantClasses: Record<ToastVariant, string> = {
    success: 'border-semantic-success-border bg-surface-1 text-semantic-success shadow-card',
    error: 'border-semantic-danger-border bg-surface-1 text-semantic-danger shadow-card',
    warning: 'border-semantic-warning-border bg-surface-1 text-semantic-warning shadow-card',
    info: 'border-semantic-info-border bg-surface-1 text-semantic-info shadow-card',
  };

  return (
    <ToastContext.Provider value={{ toast, showToast: toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-all ${variantClasses[t.variant]}`}
          >
            <span className="font-medium text-text">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-text-3 hover:text-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
