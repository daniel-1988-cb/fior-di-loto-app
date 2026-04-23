"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui";
import { DatePickerPopover } from "@/components/agenda/date-picker-popover";
import { AggiungiDropdownButton } from "@/components/agenda/aggiungi-dropdown-button";

type Props = {
  currentDate: string;
  staffCount: number;
  appointmentsCount: number;
};

export function CalendarToolbar({
  currentDate,
  staffCount,
  appointmentsCount,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const navTo = (date: string) => {
    const params = new URLSearchParams(sp.toString());
    params.set("date", date);
    router.push(`/agenda?${params.toString()}`);
  };

  const go = (deltaDays: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + deltaDays);
    navTo(d.toISOString().slice(0, 10));
  };

  const today = () => navTo(new Date().toISOString().slice(0, 10));

  const label = new Date(currentDate).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* Left cluster: oggi + chevron + date picker + chevron */}
      <Button variant="outline" size="sm" onClick={today}>
        Oggi
      </Button>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Giorno precedente"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <DatePickerPopover
        currentDate={currentDate}
        onSelect={navTo}
        triggerLabel={label}
      />
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Giorno successivo"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Center meta (hidden on narrow screens) */}
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {staffCount} membri · {appointmentsCount} appuntamenti
      </span>

      {/* Right cluster: refresh + day-view + Aggiungi */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => router.refresh()}
          aria-label="Ricarica"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled
          aria-label="Vista calendario (solo Giorno)"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground opacity-60"
          title="Vista Settimana/Mese in arrivo"
        >
          <CalendarDays className="h-4 w-4" />
          Giorno
        </button>
        <AggiungiDropdownButton currentDate={currentDate} />
      </div>
    </div>
  );
}
