"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { DatePickerPopover } from "@/components/agenda/date-picker-popover";

export function CalendarToolbar({ currentDate }: { currentDate: string }) {
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={today}>
        Oggi
      </Button>
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Giorno precedente"
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
