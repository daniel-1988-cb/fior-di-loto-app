"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDrawer } from "./notification-drawer";
import type {
  WAFailureNotification,
  AppointmentRequestNotification,
} from "@/lib/actions/notifications";

const READ_STORAGE_KEY = "fdl_read_notification_ids";
const POLL_MS = 60_000;

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [failures, setFailures] = useState<WAFailureNotification[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    AppointmentRequestNotification[]
  >([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        failures: WAFailureNotification[];
        pendingRequests: AppointmentRequestNotification[];
      };
      setFailures(json.failures ?? []);
      setPendingRequests(json.pendingRequests ?? []);
    } catch {
      // network errors are non-fatal — just skip this poll
    }
  }, []);

  // Initial fetch + poll while mounted.
  useEffect(() => {
    fetchData();
    const id = window.setInterval(fetchData, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  // Re-read read-state from localStorage when the drawer closes (so the badge
  // updates after the user clicks through items).
  useEffect(() => {
    if (open) return;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(READ_STORAGE_KEY);
      setReadIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setReadIds(new Set());
    }
  }, [open]);

  // Auto-open if URL hint present (?notifications=open).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("notifications") === "open") setOpen(true);
  }, []);

  const totalUnread =
    failures.filter((f) => !readIds.has(f.id)).length +
    pendingRequests.filter((r) => !readIds.has(r.id)).length;
  const hasFailures = failures.some((f) => !readIds.has(f.id));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
        aria-label="Notifiche"
        title="Notifiche"
      >
        <Bell className="h-4 w-4" />
        {totalUnread > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white",
              hasFailures ? "bg-danger" : "bg-primary",
            )}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        failures={failures}
        pendingRequests={pendingRequests}
      />
    </>
  );
}
