"use client";

import { useConfirmContext, type ConfirmOptions } from "@/components/ui/confirm-dialog";

/**
 * Returns a confirm() function that returns Promise<boolean>.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Eliminare?", variant: "destructive" });
 *   if (!ok) return;
 *
 * Must be used inside <ConfirmDialogProvider>.
 *
 * DECISION: Use ConfirmDialog (not undo-strip) for hard deletes where the backend
 * does NOT support restore. Use undo-strip only for soft actions (e.g. mark inactive).
 */
export function useConfirm() {
  const { openConfirm } = useConfirmContext();
  return (options: ConfirmOptions) => openConfirm(options);
}
