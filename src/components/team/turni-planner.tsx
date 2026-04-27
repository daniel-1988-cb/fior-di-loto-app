"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import {
  createTurno,
  updateTurno,
  deleteTurno,
  cloneTurniFromPreviousWeek,
  type StaffTurno,
} from "@/lib/actions/staff-turni";
import type { Staff } from "@/lib/actions/staff";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay(); // 0=dom, 1=lun, ..., 6=sab
  const shift = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + shift);
  return copy;
}

function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const s = start.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const e = end.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  return `${s} → ${e}`;
}

type ModalState =
  | { mode: "closed" }
  | {
      mode: "new";
      staffId: string;
      data: string;
    }
  | {
      mode: "edit";
      turno: StaffTurno;
    };

export function TurniPlanner({
  staff,
  initialTurni,
  initialWeekStart,
}: {
  staff: Staff[];
  initialTurni: StaffTurno[];
  initialWeekStart: string; // YYYY-MM-DD, lunedì
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState<string>(initialWeekStart);
  const [turni, setTurni] = useState<StaffTurno[]>(initialTurni);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [cloning, startCloneTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const weekStartDate = useMemo(
    () => new Date(weekStart + "T00:00:00"),
    [weekStart],
  );
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStartDate, i);
        return {
          date: d,
          iso: formatISODate(d),
          label: WEEKDAYS[i],
          dayNum: d.getDate(),
        };
      }),
    [weekStartDate],
  );

  // Indicizza turni per (staffId|iso)
  const turniByCell = useMemo(() => {
    const map = new Map<string, StaffTurno[]>();
    for (const t of turni) {
      const key = `${t.staffId}|${t.data}`;
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [turni]);

  function refresh() {
    router.refresh();
  }

  function goPrev() {
    const d = addDays(weekStartDate, -7);
    const iso = formatISODate(d);
    setWeekStart(iso);
    const params = new URLSearchParams(window.location.search);
    params.set("week", iso);
    router.push(`?${params.toString()}`);
  }

  function goNext() {
    const d = addDays(weekStartDate, 7);
    const iso = formatISODate(d);
    setWeekStart(iso);
    const params = new URLSearchParams(window.location.search);
    params.set("week", iso);
    router.push(`?${params.toString()}`);
  }

  function goThisWeek() {
    const iso = formatISODate(startOfWeek(new Date()));
    setWeekStart(iso);
    const params = new URLSearchParams(window.location.search);
    params.set("week", iso);
    router.push(`?${params.toString()}`);
  }

  function handleClone() {
    setError(null);
    startCloneTransition(async () => {
      try {
        const n = await cloneTurniFromPreviousWeek(weekStart);
        refresh();
        if (n === 0) setError("Nessun turno nella settimana precedente da clonare.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore clonazione");
      }
    });
  }

  function openNew(staffId: string, data: string) {
    setModal({ mode: "new", staffId, data });
  }

  function openEdit(turno: StaffTurno) {
    setModal({ mode: "edit", turno });
  }

  function closeModal() {
    setModal({ mode: "closed" });
  }

  async function handleSave(input: {
    oraInizio: string;
    oraFine: string;
    note: string;
  }) {
    if (modal.mode === "closed") return;
    try {
      if (modal.mode === "new") {
        const t = await createTurno({
          staffId: modal.staffId,
          data: modal.data,
          oraInizio: input.oraInizio,
          oraFine: input.oraFine,
          note: input.note || null,
        });
        setTurni((prev) => [...prev, t]);
      } else {
        const t = await updateTurno(modal.turno.id, {
          oraInizio: input.oraInizio,
          oraFine: input.oraFine,
          note: input.note || null,
        });
        setTurni((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      }
      closeModal();
      refresh();
    } catch (e) {
      throw e;
    }
  }

  async function handleDelete() {
    if (modal.mode !== "edit") return;
    const ok = await confirm({ title: "Eliminare questo turno?", confirmLabel: "Elimina", variant: "destructive" });
    if (!ok) return;
    const res = await deleteTurno(modal.turno.id);
    if (!res.ok) {
      toast.error(res.error ?? "Errore eliminazione");
      return;
    }
    setTurni((prev) => prev.filter((x) => x.id !== modal.turno.id));
    closeModal();
    refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] text-center text-sm font-medium">
            {formatWeekLabel(weekStartDate)}
          </div>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goThisWeek}>
            Questa settimana
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClone}
          disabled={cloning}
        >
          <Copy className="h-4 w-4" /> Applica settimana scorsa
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="sticky left-0 bg-muted/30 px-4 py-3 text-left font-medium">
                  Membro
                </th>
                {days.map((d) => (
                  <th key={d.iso} className="px-2 py-3 text-center font-medium">
                    <div>{d.label}</div>
                    <div className="text-[11px] font-normal text-muted-foreground">
                      {d.dayNum}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nessun membro attivo.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="sticky left-0 bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${s.nome} ${s.cognome ?? ""}`}
                          size="sm"
                          color={s.colore}
                        />
                        <span className="whitespace-nowrap font-medium">
                          {s.nome}
                        </span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const cellTurni = turniByCell.get(`${s.id}|${d.iso}`) ?? [];
                      return (
                        <td key={d.iso} className="px-1 py-2 align-top">
                          <div className="flex min-h-[48px] flex-col items-stretch gap-1">
                            {cellTurni.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => openEdit(t)}
                                className="group rounded-md border px-2 py-1 text-center text-[11px] font-medium transition-colors hover:brightness-95"
                                style={{
                                  borderColor: s.colore,
                                  backgroundColor: `${s.colore}26`,
                                  color: "var(--foreground)",
                                }}
                                title={t.note ?? undefined}
                              >
                                <div>{t.oraInizio}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {t.oraFine}
                                </div>
                              </button>
                            ))}
                            <button
                              onClick={() => openNew(s.id, d.iso)}
                              className="rounded-md border border-dashed border-border py-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                              aria-label="Aggiungi turno"
                            >
                              <Plus className="mx-auto h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.mode !== "closed" && (
        <TurnoModal
          key={modal.mode === "edit" ? modal.turno.id : `${modal.staffId}-${modal.data}`}
          staff={staff}
          modal={modal}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
        />
      )}
    </>
  );
}

function TurnoModal({
  staff,
  modal,
  onClose,
  onSave,
  onDelete,
}: {
  staff: Staff[];
  modal: Exclude<ModalState, { mode: "closed" }>;
  onClose: () => void;
  onSave: (input: {
    oraInizio: string;
    oraFine: string;
    note: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const staffMember = staff.find((s) =>
    modal.mode === "new" ? s.id === modal.staffId : s.id === modal.turno.staffId,
  );
  const initOraInizio =
    modal.mode === "edit" ? modal.turno.oraInizio : staffMember?.orario_inizio?.slice(0, 5) ?? "09:00";
  const initOraFine =
    modal.mode === "edit" ? modal.turno.oraFine : staffMember?.orario_fine?.slice(0, 5) ?? "19:00";
  const initNote = modal.mode === "edit" ? modal.turno.note ?? "" : "";

  const [oraInizio, setOraInizio] = useState(initOraInizio);
  const [oraFine, setOraFine] = useState(initOraFine);
  const [note, setNote] = useState(initNote);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const data = modal.mode === "new" ? modal.data : modal.turno.data;
  const dataLabel = new Date(data + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (oraFine <= oraInizio) {
      setErr("Ora fine deve essere dopo ora inizio");
      return;
    }
    setSaving(true);
    try {
      await onSave({ oraInizio, oraFine, note });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6">
          <h2 className="mb-1 text-lg font-semibold">
            {modal.mode === "new" ? "Nuovo turno" : "Modifica turno"}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {staffMember?.nome} · {dataLabel}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="turno-inizio">Ora inizio</Label>
              <Input
                id="turno-inizio"
                type="time"
                value={oraInizio}
                onChange={(e) => setOraInizio(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="turno-fine">Ora fine</Label>
              <Input
                id="turno-fine"
                type="time"
                value={oraFine}
                onChange={(e) => setOraFine(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor="turno-note">Note (opzionale)</Label>
            <Textarea
              id="turno-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Es. copertura chiusura serale"
            />
          </div>

          {err && (
            <p className="mt-3 text-sm text-danger">{err}</p>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <div>
              {onDelete && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" /> Elimina
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Annulla
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
