"use client";

import { useToastContext } from "@/components/ui/toast-provider";
import type { ToastAction } from "@/components/ui/toast";
import type { ReactNode } from "react";

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

/**
 * Provides toast helpers: toast.success(), toast.error(), toast.info(), toast.warning()
 *
 * Must be used inside <ToastProvider>.
 */
export function useToast() {
  const { addToast } = useToastContext();

  return {
    success(message: ReactNode, options?: ToastOptions) {
      addToast(message, "success", options);
    },
    error(message: ReactNode, options?: ToastOptions) {
      addToast(message, "error", options);
    },
    info(message: ReactNode, options?: ToastOptions) {
      addToast(message, "info", options);
    },
    warning(message: ReactNode, options?: ToastOptions) {
      addToast(message, "warning", options);
    },
  };
}
