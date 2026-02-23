import { useState, useRef, useCallback } from 'react';

export interface ToastData {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'success';
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  const showToast = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-fade-in"
        >
          <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 backdrop-blur-lg ${
            toast.type === 'error'
              ? 'bg-red-50/95 dark:bg-red-950/90 border-red-400 dark:border-red-800'
              : toast.type === 'warning'
              ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-400 dark:border-amber-800'
              : 'bg-green-50/95 dark:bg-green-950/90 border-green-400 dark:border-green-800'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'error'
                ? 'bg-red-100 dark:bg-red-900/50'
                : toast.type === 'warning'
                ? 'bg-amber-100 dark:bg-amber-900/50'
                : 'bg-green-100 dark:bg-green-900/50'
            }`}>
              {toast.type === 'error' ? (
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : toast.type === 'warning' ? (
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </div>
            <p className={`text-sm font-medium flex-1 ${
              toast.type === 'error'
                ? 'text-red-800 dark:text-red-200'
                : toast.type === 'warning'
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-green-800 dark:text-green-200'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}