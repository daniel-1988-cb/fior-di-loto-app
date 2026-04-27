"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast, type ToastItem, type ToastVariant, type ToastAction } from "./toast";

const MAX_TOASTS = 3;

interface ToastContextValue {
  addToast: (
    message: ReactNode,
    variant: ToastVariant,
    options?: { duration?: number; action?: ToastAction }
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const baseId = useId();
  const counter = { current: 0 };

  const addToast = useCallback(
    (
      message: ReactNode,
      variant: ToastVariant,
      options?: { duration?: number; action?: ToastAction }
    ) => {
      const id = `${baseId}-${Date.now()}-${++counter.current}`;
      setToasts((prev) => {
        const next = [
          ...prev,
          { id, message, variant, duration: options?.duration, action: options?.action },
        ];
        // Cap at MAX_TOASTS, removing oldest first
        return next.slice(-MAX_TOASTS);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseId]
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-label="Notifiche"
            className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none"
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <Toast toast={toast} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used within <ToastProvider>");
  return ctx;
}
