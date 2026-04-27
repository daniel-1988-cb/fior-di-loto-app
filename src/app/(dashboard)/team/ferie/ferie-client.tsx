"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import {
  approveFerie,
  createRichiestaFerie,
  getAppointmentsInRange,
  rejectFerie,
  type FerieRichiesta,
  type FerieStato,
} from "@/lib/actions/staff-ferie";
import type { Staff } from "@/lib/actions/staff";
import { useToast } from "@/lib/hooks/use-toast";

const TIPI = ["ferie", "permesso", "malattia", "altro"] as const;
type Tipo = (typeof TIPI)[number];

const STATO_VARIANT: Record<
  FerieStato,
  "warning" | "success" | "danger"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const STATO_LABEL: Record<FerieStato, string> = {
  pending: "In attesa",
  approved: "Approvata",
  rejected: "Rifiutata",
};

export function FerieClient({
  staff,
  initialFerie,
  initialStato,
}: {
  staff: Staff[];
  initialFerie: FerieRichiesta[];
  initialStato: FerieStato | "all";
}) {
  const router = useRouter();
  const [statoFilter, setStatoFilter] = useState<FerieStato | "all">(
    initialStato,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const toast = useToast();

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id, s])),
    [staff],
  );

  function changeFilter(next: FerieStato | "all") {
    setStatoFilter(next);
    const params = new URLSearchParams(window.location.search);
    params.set("stato", next);
    router.push(`?${params.toString()}`);
  }

  function doApprove(id: string) {
    setActiveId(id);
    startTransition(async () => {
      try {
        await approveFerie(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Errore approvazione");
      } finally {
        setActiveId(null);
      }
    });
  }

  function doReject(id: string) {
    setActiveId(id);
    startTransition(async () => {
      try {
        await rejectFerie(id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Errore rifiuto");
      } finally {
        setActiveId(null);
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map(
            (s) => (
              <Button
                key={s}
                variant={statoFilter === s ? "primary" : "outline"}
                size="sm"
                onClick={() => changeFilter(s)}
              >
                {s === "all" ? "Tutte" : STATO_LABEL[s]}
              </Button>
            ),
          )}
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Nuova richiesta
        </Button>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {initialFerie.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nessuna richiesta.
            </p>
          ) : (
            initialFerie.map((f) => {
              const s = staffById.get(f.staffId);
              const loading = pending && activeId === f.id;
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-4"
                >
                  {s && (
                    <Avatar
                      name={`${s.nome} ${s.cognome ?? ""}`}
                      size="md"
                      color={s.colore}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s?.nome ?? "—"}{" "}
                      <span className="text-muted-foreground">· {f.tipo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.dataInizio).toLocaleDateString("it-IT")} →{" "}
                      {new Date(f.dataFine).toLocaleDateString("it-IT")}
                    </p>
                    {f.note && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        {f.note}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATO_VARIANT[f.stato]}>
                    {STATO_LABEL[f.stato]}
                  </Badge>
                  {f.stato === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => doReject(f.id)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" /> Rifiuta
                      </Button>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => doApprove(f.id)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" /> Approva
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {modalOpen && (
        <NewFerieModal
          staff={staff}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function NewFerieModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: Staff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [tipo, setTipo] = useState<Tipo>("ferie");
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [note, setNote] = useState("");
  const [conflicts, setConflicts] = useState<
    Array<{ id: string; data: string; oraInizio: string; clientNome: string | null }>
  >([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ricalcola conflitti quando cambia staff/date
  useEffect(() => {
    if (!staffId || !dataInizio || !dataFine) {
      setConflicts([]);
      return;
    }
    if (dataFine < dataInizio) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    setLoadingConflicts(true);
    getAppointmentsInRange(staffId, dataInizio, dataFine)
      .then((appts) => {
        if (!cancelled) setConflicts(appts);
      })
      .catch(() => {
        if (!cancelled) setConflicts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingConflicts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [staffId, dataInizio, dataFine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!staffId) {
      setErr("Seleziona uno staff");
      return;
    }
    if (!dataInizio || !dataFine) {
      setErr("Seleziona data inizio e fine");
      return;
    }
    if (dataFine < dataInizio) {
      setErr("Data fine precedente a data inizio");
      return;
    }
    setSaving(true);
    try {
      await createRichiestaFerie({
        staffId,
        dataInizio,
        dataFine,
        tipo,
        note: note || null,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore creazione");
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
        className="w-full max-w-lg overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Nuova richiesta ferie</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="ferie-staff">Staff *</Label>
              <Select
                id="ferie-staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} {s.cognome ?? ""}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="ferie-tipo">Tipo *</Label>
              <Select
                id="ferie-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
              >
                {TIPI.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ferie-inizio">Data inizio *</Label>
                <Input
                  id="ferie-inizio"
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ferie-fine">Data fine *</Label>
                <Input
                  id="ferie-fine"
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ferie-note">Note (opzionale)</Label>
              <Textarea
                id="ferie-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>

            {loadingConflicts && (
              <p className="text-xs text-muted-foreground">
                Controllo appuntamenti in sovrapposizione…
              </p>
            )}

            {conflicts.length > 0 && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {conflicts.length} appuntament
                  {conflicts.length === 1 ? "o" : "i"} da riassegnare
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {conflicts.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      {new Date(a.data + "T00:00:00").toLocaleDateString(
                        "it-IT",
                        { day: "numeric", month: "short" },
                      )}{" "}
                      · {a.oraInizio} · {a.clientNome ?? "cliente"}
                    </li>
                  ))}
                  {conflicts.length > 6 && (
                    <li>…e altri {conflicts.length - 6}</li>
                  )}
                </ul>
              </div>
            )}

            {err && <p className="text-sm text-danger">{err}</p>}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creazione..." : "Crea richiesta"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
