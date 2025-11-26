import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * @interface Toast
 * Defines the shape of a toast notification object.
 * @property {string} id - A unique identifier for the toast.
 * @property {string} message - The message to be displayed in the toast.
 * @property {'success' | 'error' | 'info'} type - The type of the toast, which determines its appearance.
 * @property {number} [duration] - The duration in milliseconds for which the toast should be visible.
 */
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

/**
 * @interface ToastContextType
 * Defines the shape of the toast context.
 * @property {Toast[]} toasts - The list of current toast notifications.
 * @property {(message: string, type?: 'success' | 'error' | 'info', duration?: number) => void} showToast - Function to show a new toast.
 * @property {(id: string) => void} removeToast - Function to remove a toast by its ID.
 */
interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * ToastProvider is a component that provides toast notification functionality to its children.
 * It manages the state of toasts and exposes functions to show and remove them via the `useToast` hook.
 *
 * @param {{ children: React.ReactNode }} props - The props for the ToastProvider component.
 * @returns {JSX.Element} The rendered ToastProvider component.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3500) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * `useToast` is a custom hook that allows components to access the toast context.
 * It provides functions to show and remove toast notifications.
 * It must be used within a `ToastProvider`.
 *
 * @returns {ToastContextType} The toast context.
 * @throws {Error} If used outside of a `ToastProvider`.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
