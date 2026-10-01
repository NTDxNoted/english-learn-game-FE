import React, { useState, useCallback, useId } from 'react';
import {
  ToastContext,
  type ToastItem,
  type ToastType,
} from './toastContextDef';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [idPrefix, removeToast],
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast],
  );

  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast],
  );

  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title),
    [showToast],
  );

  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        removeToast,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};
