import React from 'react';
import { useToast } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-3 pointer-events-none">
      {toasts.map((toast) => {
        const bgColor = toast.type === 'success' ? 'bg-green-50 border-green-200' : 
                       toast.type === 'error' ? 'bg-red-50 border-red-200' : 
                       'bg-blue-50 border-blue-200';
        const iconColor = toast.type === 'success' ? 'text-green-600' : 
                         toast.type === 'error' ? 'text-red-600' : 
                         'text-blue-600';
        const textColor = toast.type === 'success' ? 'text-green-900' : 
                         toast.type === 'error' ? 'text-red-900' : 
                         'text-blue-900';

        return (
          <div
            key={toast.id}
            className={`${bgColor} border rounded-[12px] p-4 shadow-lg backdrop-blur-sm pointer-events-auto flex items-start gap-3 animate-slideIn max-w-sm`}
          >
            <div className="flex-shrink-0 pt-0.5">
              {toast.type === 'success' && (
                <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${textColor}`}>{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors pt-0.5`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};
