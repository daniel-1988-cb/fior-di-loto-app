"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Biohazard,
  ClipboardList,
  Lock,
  LockOpen,
  Pencil,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  addClientAllergia,
  addClientAvviso,
  addClientPatchTest,
  addClientTag,
  deleteClient,
  setClientBlocked,
} from "@/lib/actions/clients";
import type { TableRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

type Client = TableRow<"clients">;

interface ClientActivityMenuProps {
  client: Client;
  /** Called after any successful mutation so the parent can refresh data. */
  onUpdate: () => void;
  /** Called after "Elimina cliente" succeeds so the drawer can close. */
  onDeleted?: () => void;
  /** Called when user opens edit mode via "Modifica dettagli cliente". */
  onEdit?: () => void;
  /**
   * Optional "remove from current context" hook — e.g. from an open cart.
   * If undefined the action is rendered greyed-out.
   */
  onRemoveFromContext?: () => void;
  /** Label for the context-remove entry, e.g. "Rimuovi dal carrello". */
  removeFromContextLabel?: string;
  className?: string;
}

export function ClientActivityMenu({
  client,
  onUpdate,
  onDeleted,
  onEdit,
  onRemoveFromContext,
  removeFromContextLabel = "Rimuovi cliente dal contesto",
  className,
}: ClientActivityMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string } | void>) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (res && res.ok === false) {
        toast.error(res.error || "Operazione fallita");
        return;
      }
      onUpdate();
    } catch (e) {
      toast.error(`Errore: ${e instanceof Error ? e.message : "sconosciuto"}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function promptText(message: string, initial = ""): string | null {
    // `window.prompt` is intentional: used for quick inline text input
    const v = window.prompt(message, initial);
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed ? trimmed : null;
  }

  const handleAvviso = () => {
    const v = promptText("Avviso per il personale:", client.avviso_personale ?? "");
    if (v == null) return;
    void run(() => addClientAvviso(client.id, v));
  };

  const handleAllergia = () => {
    const v = promptText("Aggiungi allergia (es. nichel, fragranza, latex):");
    if (v == null) return;
    void run(() => addClientAllergia(client.id, v));
  };

  const handlePatchTest = () => {
    const today = new Date().toISOString().slice(0, 10);
    const v = promptText(
      `Patch test (formato "${today}: note" oppure solo note — la data di oggi viene aggiunta in automatico):`,
      `${today}: `,
    );
    if (v == null) return;
    void run(() => addClientPatchTest(client.id, v));
  };

  const handleTag = () => {
    const v = promptText("Nuovo tag (es. VIP, allergica, fedeltà):");
    if (v == null) return;
    void run(() => addClientTag(client.id, v));
  };

  const handleToggleBlocked = async () => {
    const next = !client.blocked;
    const msg = next
      ? "Bloccare questo cliente? Non potrà essere aggiunto a nuovi appuntamenti."
      : "Sbloccare questo cliente?";
    const ok = await confirm({ title: msg, confirmLabel: next ? "Blocca" : "Sblocca" });
    if (!ok) return;
    void run(() => setClientBlocked(client.id, next));
  };

  const handleDelete = async () => {
    const full = `${client.nome} ${client.cognome}`.trim();
    const ok = await confirm({
      title: `Eliminare definitivamente "${full}"?`,
      message: "L'azione è irreversibile.",
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    setBusy(true);
    deleteClient(client.id)
      .then(() => {
        setOpen(false);
        onDeleted?.();
        onUpdate();
      })
      .catch((e) => toast.error(`Errore eliminazione: ${e instanceof Error ? e.message : "sconosciuto"}`))
      .finally(() => setBusy(false));
  };

  const handleEdit = () => {
    setOpen(false);
    onEdit?.();
  };

  const handleRemoveContext = () => {
    if (!onRemoveFromContext) return;
    onRemoveFromContext();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-transparent px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <Activity className="h-4 w-4" /> Attività
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl ring-1 ring-black/5 dark:ring-white/5"
        >
          <MenuSection>
            <MenuItem
              icon={<X className="h-4 w-4" />}
              label={removeFromContextLabel}
              onClick={handleRemoveContext}
              disabled={!onRemoveFromContext || busy}
            />
          </MenuSection>

          <MenuDivider />

          <MenuSection label="Azioni rapide">
            <MenuItem
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              label="Aggiungi avviso per il personale"
              onClick={handleAvviso}
              disabled={busy}
            />
            <MenuItem
              icon={<Biohazard className="h-4 w-4 text-orange-500" />}
              label="Aggiungi allergia"
              onClick={handleAllergia}
              disabled={busy}
            />
            <MenuItem
              icon={<ClipboardList className="h-4 w-4 text-sky-500" />}
              label="Aggiungi patch test"
              onClick={handlePatchTest}
              disabled={busy}
            />
            <MenuItem
              icon={<Tag className="h-4 w-4 text-violet-500" />}
              label="Aggiungi tag"
              onClick={handleTag}
              disabled={busy}
            />
          </MenuSection>

          <MenuDivider />

          <MenuSection>
            <MenuItem
              icon={<Pencil className="h-4 w-4" />}
              label="Modifica dettagli cliente"
              onClick={handleEdit}
              disabled={!onEdit || busy}
            />
            <MenuItem
              icon={
                client.blocked ? (
                  <LockOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )
              }
              label={client.blocked ? "Sblocca cliente" : "Blocca cliente"}
              onClick={handleToggleBlocked}
              disabled={busy}
            />
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Elimina cliente"
              onClick={handleDelete}
              disabled={busy}
              destructive
            />
          </MenuSection>
        </div>
      )}
    </div>
  );
}

function MenuSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="py-1">
      {label && (
        <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function MenuDivider() {
  return <div className="h-px bg-border" />;
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        destructive
          ? "text-red-600 dark:text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10"
          : "text-foreground",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
