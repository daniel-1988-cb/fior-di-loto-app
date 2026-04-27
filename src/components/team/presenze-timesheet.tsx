"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { clockIn, clockOut } from "@/lib/actions/staff-presenze";
import type { MonthlySummary } from "@/lib/actions/staff-presenze";
import type { Staff } from "@/lib/actions/staff";
import { useToast } from "@/lib/hooks/use-toast";

export type PresenzaCurrent = {
  staffId: string;
  clockIn: string;
} | null;

export function PresenzeTimesheet({
  staff,
  current,
  monthly,
  year,
  month,
}: {
  staff: Staff[];
  current: Record<string, PresenzaCurrent>;
  monthly: Record<string, MonthlySummary>;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const toast = useToast();

  function monthLabel(y: number, m: number) {
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }

  function nav(deltaMonths: number) {
    let newMonth = month + deltaMonths;
    let newYear = year;
    while (newMonth < 1) {
      newMonth += 12;
      newYear -= 1;
    }
    while (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    router.push(`?${params.toString()}`);
  }

  function doClockIn(staffId: string) {
    setActiveStaffId(staffId);
    startTransition(async () => {
      try {
        await clockIn(staffId);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Errore clock in");
      } finally {
        setActiveStaffId(null);
      }
    });
  }

  function doClockOut(staffId: string) {
    setActiveStaffId(staffId);
    startTransition(async () => {
      try {
        await clockOut(staffId);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Errore clock out");
      } finally {
        setActiveStaffId(null);
      }
    });
  }

  function formatDuration(startIso: string): string {
    const ms = Date.now() - new Date(startIso).getTime();
    if (ms < 0) return "0m";
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  return (
    <>
      <Card className="mb-4">
        <div className="p-5">
          <h2 className="mb-3 text-base font-semibold">Stato attuale</h2>
          <div className="divide-y divide-border">
            {staff.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nessun membro attivo.
              </p>
            ) : (
              staff.map((s) => {
                const cur = current[s.id];
                const isActive = Boolean(cur);
                const loading = pending && activeStaffId === s.id;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <Avatar
                      name={`${s.nome} ${s.cognome ?? ""}`}
                      size="md"
                      color={s.colore}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {s.nome} {s.cognome ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isActive && cur
                          ? `Entrata ${new Date(cur.clockIn).toLocaleTimeString(
                              "it-IT",
                              { hour: "2-digit", minute: "2-digit" },
                            )} · ${formatDuration(cur.clockIn)}`
                          : "Non presente"}
                      </p>
                    </div>
                    <Badge variant={isActive ? "success" : "default"}>
                      {isActive ? "In servizio" : "Non presente"}
                    </Badge>
                    {isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => doClockOut(s.id)}
                        disabled={loading}
                      >
                        <LogOut className="h-4 w-4" />
                        {loading ? "..." : "Clock out"}
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => doClockIn(s.id)}
                        disabled={loading}
                      >
                        <LogIn className="h-4 w-4" />
                        {loading ? "..." : "Clock in"}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Riepilogo mensile</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => nav(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm capitalize">
                {monthLabel(year, month)}
              </span>
              <Button variant="outline" size="sm" onClick={() => nav(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Membro</th>
                  <th className="px-4 py-3 text-right font-medium">Ore totali</th>
                  <th className="px-4 py-3 text-right font-medium">Giorni</th>
                  <th className="px-4 py-3 text-right font-medium">Media h/g</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Nessun dato.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => {
                    const summary = monthly[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={`${s.nome} ${s.cognome ?? ""}`}
                              size="sm"
                              color={s.colore}
                            />
                            <span className="font-medium">{s.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {summary ? `${summary.oreTotali.toFixed(1)} h` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {summary ? summary.giorniLavorati : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {summary
                            ? `${summary.mediaOreGiorno.toFixed(1)} h`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </>
  );
}
