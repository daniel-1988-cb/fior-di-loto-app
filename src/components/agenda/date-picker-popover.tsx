"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers date (leggeri, nessuna lib) ────────────────────────────────────

/** Parse "YYYY-MM-DD" in Date locale (mezzogiorno per evitare drift DST). */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Format Date → "YYYY-MM-DD" in locale time (non UTC). */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Matrice 6x7 del mese a partire dal lunedì (convenzione IT).
 * Include giorni trailing/leading del mese precedente/successivo.
 */
function getMonthMatrix(monthStart: Date): Date[][] {
  // getDay(): 0=dom, 1=lun, ... 6=sab. Vogliamo offset lun=0 .. dom=6
  const firstDow = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstDow);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(addDays(gridStart, w * 7 + i));
    }
    weeks.push(row);
  }
  return weeks;
}

// Italiano minuscolo
const WEEKDAYS_IT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

const monthLabelFmt = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
});

function formatMonthLabel(d: Date): string {
  const raw = monthLabelFmt.format(d);
  // Capitalizza il mese ("aprile 2026" → "Aprile 2026")
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ─── Component ──────────────────────────────────────────────────────────────

type Props = {
  /** Data selezionata corrente, formato "YYYY-MM-DD". */
  currentDate: string;
  /** Callback quando l'utente sceglie una data (stesso formato). */
  onSelect: (date: string) => void;
  /** Testo del trigger (es. "mar 21 apr 2026"). */
  triggerLabel: string;
};

type MoreOption = { label: string; months: number };

const MORE_OPTIONS: MoreOption[] = [
  { label: "Tra 2 mesi", months: 2 },
  { label: "Tra 3 mesi", months: 3 },
  { label: "Tra 6 mesi", months: 6 },
];

export function DatePickerPopover({
  currentDate,
  onSelect,
  triggerLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const selected = useMemo(() => parseIsoDate(currentDate), [currentDate]);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  // Mese mostrato a sinistra nel popover.
  const [leftMonth, setLeftMonth] = useState<Date>(() => startOfMonth(selected));

  // Se cambia la data selezionata da fuori, risincronizza la view sul suo mese.
  useEffect(() => {
    setLeftMonth(startOfMonth(selected));
  }, [selected]);

  // Resetta "Altro" dropdown quando chiudo il popover.
  useEffect(() => {
    if (!open) setMoreOpen(false);
  }, [open]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        e.stopPropagation();
      }
    },
    [open],
  );

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  const pickDate = useCallback(
    (d: Date) => {
      onSelect(toIsoDate(d));
      setOpen(false);
    },
    [onSelect],
  );

  const jumpDays = useCallback(
    (n: number) => {
      pickDate(addDays(today, n));
    },
    [pickDate, today],
  );

  const jumpMonths = useCallback(
    (n: number) => {
      const target = new Date(today);
      target.setMonth(target.getMonth() + n);
      pickDate(target);
    },
    [pickDate, today],
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Seleziona data"
          className="absolute left-1/2 top-full z-50 mt-2 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-4 text-foreground shadow-lg"
        >
          {/* Header con chevron prev/next */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLeftMonth((m) => addMonths(m, -1))}
              aria-label="Mese precedente"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {/* spacer visivo — i titoli mese sono sopra ogni grid */}
            </span>
            <button
              type="button"
              onClick={() => setLeftMonth((m) => addMonths(m, 1))}
              aria-label="Mese successivo"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Due mesi affiancati */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <MonthGrid
              monthStart={leftMonth}
              selected={selected}
              today={today}
              onPick={pickDate}
            />
            <MonthGrid
              monthStart={rightMonth}
              selected={selected}
              today={today}
              onPick={pickDate}
            />
          </div>

          {/* Footer quick-jump */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <QuickPill onClick={() => jumpDays(7)}>Tra 1 settimana</QuickPill>
            <QuickPill onClick={() => jumpDays(14)}>Tra 2 settimane</QuickPill>
            <QuickPill onClick={() => jumpDays(21)}>Tra 3 settimane</QuickPill>
            <QuickPill onClick={() => jumpDays(28)}>Tra 4 settimane</QuickPill>
            <QuickPill onClick={() => jumpDays(35)}>Tra 5 settimane</QuickPill>

            <div className="relative">
              <QuickPill onClick={() => setMoreOpen((v) => !v)}>
                Altro
              </QuickPill>
              {moreOpen && (
                <div className="absolute bottom-full left-0 z-10 mb-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  {MORE_OPTIONS.map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        jumpMonths(opt.months);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sotto-componenti interni ───────────────────────────────────────────────

function MonthGrid({
  monthStart,
  selected,
  today,
  onPick,
}: {
  monthStart: Date;
  selected: Date;
  today: Date;
  onPick: (d: Date) => void;
}) {
  const weeks = useMemo(() => getMonthMatrix(monthStart), [monthStart]);
  return (
    <div>
      <div className="mb-2 text-center text-base font-semibold text-foreground">
        {formatMonthLabel(monthStart)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS_IT.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const inMonth = isSameMonth(day, monthStart);
            const isSel = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => onPick(day)}
                className={cn(
                  "relative flex h-9 w-full items-center justify-center rounded-full text-sm transition-colors",
                  inMonth
                    ? "text-foreground"
                    : "text-muted-foreground/60",
                  !isSel && "hover:bg-muted",
                  isSel &&
                    "bg-rose text-white hover:opacity-90 font-semibold",
                  !isSel &&
                    isToday &&
                    "border border-rose/60 font-semibold",
                )}
                aria-label={day.toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                aria-pressed={isSel}
              >
                {day.getDate()}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function QuickPill({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      {children}
    </button>
  );
}
