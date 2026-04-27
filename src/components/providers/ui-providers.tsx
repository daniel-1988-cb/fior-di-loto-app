"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

/**
 * Client-side providers for Toast + ConfirmDialog.
 * Import this in any server layout that needs toast/confirm in its subtree.
 */
export function UiProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </ToastProvider>
  );
}
