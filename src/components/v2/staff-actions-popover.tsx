"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Columns3,
  Columns,
  CalendarDays,
  Plus,
  Ban,
  Clock,
  Plane,
  User,
  Check,
} from "lucide-react";

interface Props {
  staff: {
    id: string;
    nome: string;
    cognome?: string | null;
    avatar_url?: string | null;
    colore?: string | null;
  };
  currentDate: string; // YYYY-MM-DD per prefill
  /** Vista corrente per check (per ora sempre "day"). */
  currentView?: "day" | "3day" | "week" | "month";
  children: React.ReactNode;
}

export function StaffActionsPopover({
  staff,
  currentDate,
  currentView = "day",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEscape);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onEscape);
      };
    }
  }, [open]);

  const fullName = `${staff.nome}${staff.cognome ? " " + staff.cognome : ""}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        aria-label={`Azioni per ${fullName}`}
        aria-expanded={open}
      >
        {children}
      </button>

      {open && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 w-[280px] -translate-x-1/2 rounded-xl border border-border bg-card shadow-lg"
          role="menu"
        >
          {/* Header */}
          <div className="border-b border-border p-3 text-center">
            <p className="font-semibold text-foreground">{fullName}</p>
          </div>

          {/* Visualizzazioni */}
          <div className="p-2">
            <ViewItem
              icon={<Calendar className="h-4 w-4" />}
              label="Visualizzazione giornaliera"
              active={currentView === "day"}
              onClick={() => setOpen(false)}
            />
            <ViewItem
              icon={<Columns3 className="h-4 w-4" />}
              label="Visualizzazione a 3 giorni"
              disabled
              comingSoon
            />
            <ViewItem
              icon={<Columns className="h-4 w-4" />}
              label="Visualizzazione settimanale"
              disabled
              comingSoon
            />
            <ViewItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="Visualizzazione mensile"
              disabled
              comingSoon
            />
          </div>

          {/* Attività section */}
          <div className="border-t border-border p-2">
            <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attività
            </p>
            <ActionLink
              icon={<Plus className="h-4 w-4" />}
              label="Aggiungi appuntamento"
              href={`/agenda/nuovo?staffId=${staff.id}&data=${currentDate}`}
              onClick={() => setOpen(false)}
            />
            <ActionLink
              icon={<Ban className="h-4 w-4" />}
              label="Aggiungi fascia oraria bloccata"
              href={`/agenda/nuovo?staffId=${staff.id}&data=${currentDate}&type=block`}
              onClick={() => setOpen(false)}
            />
            <ActionLink
              icon={<Clock className="h-4 w-4" />}
              label="Modifica turno"
              href={`/team/turni?staffId=${staff.id}`}
              onClick={() => setOpen(false)}
            />
            <ActionLink
              icon={<Plane className="h-4 w-4" />}
              label="Aggiungi ferie"
              href={`/team/ferie?staffId=${staff.id}&action=new`}
              onClick={() => setOpen(false)}
            />
            <ActionLink
              icon={<User className="h-4 w-4" />}
              label="Visualizza membro del team"
              href={`/impostazioni/staff/${staff.id}`}
              onClick={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ViewItem({
  icon,
  label,
  active,
  disabled,
  comingSoon,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : "hover:bg-muted text-foreground"
      }`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {active && <Check className="h-4 w-4 text-rose" />}
      {comingSoon && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          soon
        </span>
      )}
    </button>
  );
}

function ActionLink({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}
