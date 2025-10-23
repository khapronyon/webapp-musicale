'use client';

import { useState, useEffect } from 'react';

let toastIdCounter = 0;
const toastCallbacks = new Set();

export function showToast(message, type = 'info') {
  const toast = {
    id: toastIdCounter++,
    message,
    type, // 'success', 'error', 'warning', 'info'
    timestamp: Date.now(),
  };
  
  toastCallbacks.forEach(callback => callback(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const callback = (toast) => {
      setToasts(prev => [...prev, toast]);
      
      // Rimuovi automaticamente dopo 5 secondi
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    };

    toastCallbacks.add(callback);
    return () => toastCallbacks.delete(callback);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type) => {
    const styles = {
      success: 'bg-primary text-white border-primary-dark',
      error: 'bg-red-500 text-white border-red-700',
      warning: 'bg-yellow-500 text-white border-yellow-700',
      info: 'bg-secondary text-white border-secondary',
    };
    return styles[type] || styles.info;
  };

  const getToastIcon = (type) => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type] || icons.info;
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyles(toast.type)}
            rounded-lg shadow-lg border-2 p-4 
            animate-slide-in-right
            flex items-center gap-3
            backdrop-blur-sm bg-opacity-95
          `}
        >
          <div className="text-2xl flex-shrink-0">
            {getToastIcon(toast.type)}
          </div>
          <p className="flex-1 font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:text-gray-200 transition flex-shrink-0 text-xl"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}