"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: ReactNode;
  variant: ToastVariant;
  /** ms — default 4000, 12000 for error */
  duration?: number;
  action?: ToastAction;
}

const variantStyles: Record<ToastVariant, string> = {
  success:
    "bg-white border border-green-200 text-foreground [&_[data-icon]]:text-green-600",
  error:
    "bg-white border border-rose-dark/30 text-foreground [&_[data-icon]]:text-rose-dark",
  info: "bg-white border border-brown/20 text-foreground [&_[data-icon]]:text-brown",
  warning:
    "bg-white border border-gold/50 text-foreground [&_[data-icon]]:text-gold-dark",
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: (
    <svg
      data-icon
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg
      data-icon
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg
      data-icon
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg
      data-icon
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? (toast.variant === "error" ? 12000 : 4000);
  // Animate in: start hidden, go visible after mount
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-up animation on mount
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const startTimer = () => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
  };

  const pauseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = toast.variant === "error" || toast.variant === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      style={{
        transition: "opacity 0.25s ease, transform 0.25s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
      className={cn(
        "flex items-start gap-3 w-full max-w-sm rounded-xl shadow-lg px-4 py-3",
        variantStyles[toast.variant]
      )}
    >
      {variantIcons[toast.variant]}
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="text-sm font-semibold text-primary hover:opacity-80 shrink-0 transition-opacity"
        >
          {toast.action.label}
        </button>
      )}
      <button
        aria-label="Chiudi notifica"
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
