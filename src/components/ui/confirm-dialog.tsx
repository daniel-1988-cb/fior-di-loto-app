"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" shows the confirm button in danger style */
  variant?: "destructive" | "default";
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface DialogProps {
  state: DialogState;
  onClose: (confirmed: boolean) => void;
}

function ConfirmDialogModal({ state, onClose }: DialogProps) {
  const dialogId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Focus on cancel (safer default)
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Esc key dismisses
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      // Focus trap: Tab cycles between Cancel and Confirm
      if (e.key === "Tab") {
        e.preventDefault();
        if (document.activeElement === cancelRef.current) {
          confirmRef.current?.focus();
        } else {
          cancelRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const overlayStyle: CSSProperties = {
    transition: "opacity 0.2s ease",
    opacity: visible ? 1 : 0,
  };
  const contentStyle: CSSProperties = {
    transition: "opacity 0.2s ease, transform 0.2s ease",
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.95)",
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={state.message ? `${dialogId}-desc` : undefined}
    >
      {/* Overlay */}
      <button
        aria-label="Annulla"
        onClick={() => onClose(false)}
        className="absolute inset-0 bg-black/60"
        style={overlayStyle}
        tabIndex={-1}
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        )}
        style={contentStyle}
      >
        <h2
          id={`${dialogId}-title`}
          className="text-base font-semibold text-foreground mb-2"
        >
          {state.title}
        </h2>
        {state.message && (
          <p
            id={`${dialogId}-desc`}
            className="text-sm text-muted-foreground mb-6 leading-relaxed"
          >
            {state.message}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            size="sm"
            onClick={() => onClose(false)}
          >
            {state.cancelLabel ?? "Annulla"}
          </Button>
          <Button
            ref={confirmRef}
            variant={state.variant === "destructive" ? "danger" : "primary"}
            size="sm"
            onClick={() => onClose(true)}
          >
            {state.confirmLabel ?? "Conferma"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (dialog) {
        dialog.resolve(confirmed);
        setDialog(null);
      }
    },
    [dialog]
  );

  return (
    <ConfirmContext.Provider value={{ openConfirm }}>
      {children}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <ConfirmDialogModal state={dialog} onClose={handleClose} />,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmContext(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirmContext must be used within <ConfirmDialogProvider>");
  return ctx;
}
