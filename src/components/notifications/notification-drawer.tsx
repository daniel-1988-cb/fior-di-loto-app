"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Package,
  Trash2,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type {
  WAFailureNotification,
  AppointmentRequestNotification,
  StockAlertNotification,
} from "@/lib/actions/notifications";

const READ_STORAGE_KEY = "fdl_read_notification_ids";

type Tab = "richieste" | "falliti" | "magazzino";

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  failures: WAFailureNotification[];
  pendingRequests: AppointmentRequestNotification[];
  stockAlerts: StockAlertNotification[];
  onMarkRead?: (ids: string[]) => void;
  onDismissRequest?: (requestId: string) => Promise<void>;
}

export function NotificationDrawer({
  open,
  onClose,
  failures,
  pendingRequests,
  stockAlerts,
  onMarkRead,
  onDismissRequest,
}: NotificationDrawerProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>(() =>
    failures.length > 0 ? "falliti" : "richieste",
  );

  // Load read state from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(READ_STORAGE_KEY);
      if (raw) setReadIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // When the drawer opens, default tab to whichever has unread items.
  // Priorità: stock "out" → falliti → richieste → magazzino "low" → fallback richieste.
  useEffect(() => {
    if (!open) return;
    const unreadFailures = failures.filter((f) => !readIds.has(f.id)).length;
    const unreadRequests = pendingRequests.filter((r) => !readIds.has(r.id)).length;
    const unreadOut = stockAlerts.filter(
      (s) => s.level === "out" && !readIds.has(s.id),
    ).length;
    const unreadLow = stockAlerts.filter(
      (s) => s.level === "low" && !readIds.has(s.id),
    ).length;
    if (unreadOut > 0) setTab("magazzino");
    else if (unreadFailures > 0) setTab("falliti");
    else if (unreadRequests > 0) setTab("richieste");
    else if (unreadLow > 0) setTab("magazzino");
  }, [open, failures, pendingRequests, stockAlerts, readIds]);

  function markRead(id: string) {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        window.localStorage.setItem(
          READ_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore quota errors
      }
      onMarkRead?.([id]);
      return next;
    });
  }

  const unreadFailureCount = failures.filter((f) => !readIds.has(f.id)).length;
  const unreadRequestCount = pendingRequests.filter((r) => !readIds.has(r.id))
    .length;
  const unreadStockCount = stockAlerts.filter((s) => !readIds.has(s.id)).length;
  const hasOutOfStock = stockAlerts.some(
    (s) => s.level === "out" && !readIds.has(s.id),
  );

  return (
    <Drawer open={open} onClose={onClose} title="Notifiche" side="right" width="lg">
      {/* Tab bar orizzontale — sostituisce la rail Treatwell-style che aveva
         un layout instabile (`-m-6 flex h-full` non si propagava sotto il
         body Drawer e clippava le card). Stessa info, layout robusto. */}
      <div className="-mx-6 -mt-6 mb-4 flex gap-1 border-b border-border bg-muted/30 px-3 py-2">
        <TabButton
          active={tab === "richieste"}
          onClick={() => setTab("richieste")}
          icon={<MessageSquare className="h-4 w-4" />}
          label="Richieste"
          badge={unreadRequestCount}
        />
        <TabButton
          active={tab === "falliti"}
          onClick={() => setTab("falliti")}
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Invii falliti"
          badge={unreadFailureCount}
          tone={unreadFailureCount > 0 ? "danger" : "default"}
        />
        <TabButton
          active={tab === "magazzino"}
          onClick={() => setTab("magazzino")}
          icon={<Package className="h-4 w-4" />}
          label="Magazzino"
          badge={unreadStockCount}
          tone={hasOutOfStock ? "danger" : "default"}
        />
      </div>

      {tab === "richieste" && (
        <RichiesteTab
          items={pendingRequests}
          readIds={readIds}
          onItemRead={markRead}
          onClose={onClose}
          onDismiss={onDismissRequest}
        />
      )}
      {tab === "falliti" && (
        <FallitiTab
          items={failures}
          readIds={readIds}
          onItemRead={markRead}
          onClose={onClose}
        />
      )}
      {tab === "magazzino" && (
        <MagazzinoTab
          items={stockAlerts}
          readIds={readIds}
          onItemRead={markRead}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0",
          tone === "danger" && badge > 0 && "text-danger",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
      {badge > 0 && (
        <span
          className={cn(
            "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white",
            tone === "danger" ? "bg-danger" : "bg-primary",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function RichiesteTab({
  items,
  readIds,
  onItemRead,
  onClose,
  onDismiss,
}: {
  items: AppointmentRequestNotification[];
  readIds: Set<string>;
  onItemRead: (id: string) => void;
  onClose: () => void;
  onDismiss?: (requestId: string) => Promise<void>;
}) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nessuna richiesta pendente"
        sub="Quando arrivano richieste dal bot WhatsApp le trovi qui."
      />
    );
  }

  async function handleDismiss(id: string) {
    if (!onDismiss) return;
    if (!window.confirm("Eliminare questa richiesta? Non sarà più visibile.")) {
      return;
    }
    setDismissingId(id);
    try {
      await onDismiss(id);
      onItemRead(id);
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const isRead = readIds.has(it.id);
        const isDismissing = dismissingId === it.id;
        return (
          <li
            key={it.id}
            className={cn(
              "rounded-lg border border-border bg-card p-4 transition-opacity",
              isRead && "opacity-60",
              isDismissing && "opacity-30 pointer-events-none",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{it.clientName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelative(it.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Richiesta
              </span>
            </div>
            {it.testoRichiesta && (
              <p className="mt-3 line-clamp-3 text-sm text-foreground/90">
                {it.testoRichiesta}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              {onDismiss ? (
                <button
                  type="button"
                  onClick={() => handleDismiss(it.id)}
                  disabled={isDismissing}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                  aria-label="Elimina richiesta"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Elimina
                </button>
              ) : (
                <span />
              )}
              <Link
                href="/whatsapp/richieste"
                onClick={() => {
                  onItemRead(it.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Apri richiesta <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FallitiTab({
  items,
  readIds,
  onItemRead,
  onClose,
}: {
  items: WAFailureNotification[];
  readIds: Set<string>;
  onItemRead: (id: string) => void;
  onClose: () => void;
}) {
  const grouped = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const sorted = [...items].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
    const today: WAFailureNotification[] = [];
    const earlier: WAFailureNotification[] = [];
    for (const it of sorted) {
      if (it.createdAt.slice(0, 10) === todayKey) today.push(it);
      else earlier.push(it);
    }
    return { today, earlier };
  }, [items]);

  if (items.length === 0) {
    return <EmptyState title="Tutto a posto 🪷" sub="Nessun invio fallito nelle ultime 24h." />;
  }

  return (
    <div className="space-y-6">
      {grouped.today.length > 0 && (
        <Section title="Oggi">
          {grouped.today.map((it) => (
            <FailureCard
              key={it.id}
              item={it}
              isRead={readIds.has(it.id)}
              onItemRead={onItemRead}
              onClose={onClose}
            />
          ))}
        </Section>
      )}
      {grouped.earlier.length > 0 && (
        <Section title="Ieri">
          {grouped.earlier.map((it) => (
            <FailureCard
              key={it.id}
              item={it}
              isRead={readIds.has(it.id)}
              onItemRead={onItemRead}
              onClose={onClose}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function MagazzinoTab({
  items,
  readIds,
  onItemRead,
  onClose,
}: {
  items: StockAlertNotification[];
  readIds: Set<string>;
  onItemRead: (id: string) => void;
  onClose: () => void;
}) {
  const grouped = useMemo(() => {
    const out: StockAlertNotification[] = [];
    const low: StockAlertNotification[] = [];
    for (const it of items) {
      if (it.level === "out") out.push(it);
      else low.push(it);
    }
    return { out, low };
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Magazzino in regola 🪷"
        sub="Nessun prodotto sotto la soglia di allerta."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.out.length > 0 && (
        <Section title="Esauriti">
          {grouped.out.map((it) => (
            <StockAlertCard
              key={it.id}
              item={it}
              isRead={readIds.has(it.id)}
              onItemRead={onItemRead}
              onClose={onClose}
            />
          ))}
        </Section>
      )}
      {grouped.low.length > 0 && (
        <Section title="In esaurimento">
          {grouped.low.map((it) => (
            <StockAlertCard
              key={it.id}
              item={it}
              isRead={readIds.has(it.id)}
              onItemRead={onItemRead}
              onClose={onClose}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function StockAlertCard({
  item,
  isRead,
  onItemRead,
  onClose,
}: {
  item: StockAlertNotification;
  isRead: boolean;
  onItemRead: (id: string) => void;
  onClose: () => void;
}) {
  const isOut = item.level === "out";
  return (
    <li
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-opacity",
        isRead && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.nome}</p>
          {item.categoria && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.categoria}
            </p>
          )}
        </div>
        <Pill tone={isOut ? "danger" : "default"}>
          {isOut ? "Esaurito" : `Solo ${item.giacenza}`}
        </Pill>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Soglia: {item.sogliaAlert} · Giacenza: {item.giacenza}
        </span>
        <Link
          href={`/prodotti/${item.id}/modifica`}
          onClick={() => {
            onItemRead(item.id);
            onClose();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Apri scheda <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </li>
  );
}

function FailureCard({
  item,
  isRead,
  onItemRead,
  onClose,
}: {
  item: WAFailureNotification;
  isRead: boolean;
  onItemRead: (id: string) => void;
  onClose: () => void;
}) {
  const fullName = `${item.clienteNome} ${item.clienteCognome}`.trim() || "Cliente";
  const sourceLabel =
    item.source === "reminder" ? "Reminder" : "Follow-up";
  const channelLabel = item.channel === "email" ? "Email" : "WhatsApp";
  return (
    <li
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-opacity",
        isRead && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.servizioNome ?? "Appuntamento"} · {item.apptOra}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Pill tone="danger">{channelLabel} fallito</Pill>
          <Pill>{sourceLabel}</Pill>
        </div>
      </div>
      {item.error && (
        <p className="mt-3 break-words text-xs text-danger/80">
          {truncate(item.error, 200)}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatRelative(item.createdAt)}
        </span>
        <Link
          href={`/agenda?openAppointment=${item.appointmentId}`}
          onClick={() => {
            onItemRead(item.id);
            onClose();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Vai all'appuntamento <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </li>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "danger"
          ? "bg-danger/10 text-danger"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function formatRelative(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} ore fa`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ieri";
  return `${diffD} giorni fa`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
