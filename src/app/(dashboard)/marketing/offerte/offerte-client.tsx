"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Select,
} from "@/components/ui";
import { Plus, BadgePercent, Edit3, Trash2, Copy } from "lucide-react";
import {
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferAttivo,
  type Offer,
} from "@/lib/actions/offers";
import { type TipoSconto } from "@/lib/constants/offers";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

const SEGMENTI = ["lead", "nuova", "lotina", "inattiva", "vip"] as const;

type FormState = {
  codice: string;
  descrizione: string;
  tipoSconto: TipoSconto;
  valoreSconto: string;
  validitaDa: string;
  validitaA: string;
  maxUsi: string;
  segmentiApplicabili: Set<string>;
  attivo: boolean;
};

const EMPTY: FormState = {
  codice: "",
  descrizione: "",
  tipoSconto: "percentuale",
  valoreSconto: "",
  validitaDa: "",
  validitaA: "",
  maxUsi: "",
  segmentiApplicabili: new Set(),
  attivo: true,
};

function formatSconto(o: Offer): string {
  if (o.tipoSconto === "percentuale") return `-${o.valoreSconto}%`;
  return `-${o.valoreSconto.toFixed(2)} €`;
}

export function OfferteClient({ offers }: { offers: Offer[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  function openNew() {
    setForm({ ...EMPTY, segmentiApplicabili: new Set() });
    setError(null);
    setEditing("new");
  }

  function openEdit(o: Offer) {
    setForm({
      codice: o.codice,
      descrizione: o.descrizione ?? "",
      tipoSconto: o.tipoSconto,
      valoreSconto: String(o.valoreSconto),
      validitaDa: o.validitaDa ?? "",
      validitaA: o.validitaA ?? "",
      maxUsi: o.maxUsi ? String(o.maxUsi) : "",
      segmentiApplicabili: new Set(o.segmentiApplicabili),
      attivo: o.attivo,
    });
    setError(null);
    setEditing(o.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  async function handleDelete(o: Offer) {
    const ok = await confirm({
      title: `Eliminare "${o.codice}"?`,
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    const res = await deleteOffer(o.id);
    if (!res.ok && res.error !== "archived") {
      toast.error(res.error ?? "Errore eliminazione");
      return;
    }
    if (res.error === "archived")
      toast.info("Offerta già usata: archiviata (attivo=false).");
    router.refresh();
  }

  async function handleToggle(o: Offer) {
    await toggleOfferAttivo(o.id, !o.attivo);
    router.refresh();
  }

  function copyCode(codice: string) {
    navigator.clipboard?.writeText(codice);
  }

  function toggleSegmento(seg: string) {
    setForm((prev) => {
      const next = new Set(prev.segmentiApplicabili);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return { ...prev, segmentiApplicabili: next };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const val = parseFloat(form.valoreSconto);
    const maxU = form.maxUsi ? parseInt(form.maxUsi, 10) : null;

    if (!form.codice.trim()) return setError("Codice obbligatorio");
    if (isNaN(val) || val < 0) return setError("Valore sconto non valido");
    if (form.tipoSconto === "percentuale" && val > 100)
      return setError("Percentuale > 100");
    if (maxU !== null && (!Number.isInteger(maxU) || maxU <= 0))
      return setError("Max usi non valido");

    const payload = {
      codice: form.codice.trim(),
      descrizione: form.descrizione.trim() || null,
      tipoSconto: form.tipoSconto,
      valoreSconto: val,
      validitaDa: form.validitaDa || null,
      validitaA: form.validitaA || null,
      maxUsi: maxU,
      segmentiApplicabili: Array.from(form.segmentiApplicabili),
      attivo: form.attivo,
    };

    start(async () => {
      try {
        if (editing === "new") {
          await createOffer(payload);
        } else if (editing) {
          await updateOffer(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offerte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {offers.filter((o) => o.attivo).length} attive su {offers.length} totali.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nuova offerta
        </Button>
      </header>

      {offers.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BadgePercent className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessuna offerta</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crea codici sconto da usare nelle campagne o al checkout.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((o) => {
            const usoPercent = o.maxUsi
              ? Math.min(100, Math.round((o.usiCorrenti / o.maxUsi) * 100))
              : 0;
            return (
              <Card key={o.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <BadgePercent className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold font-mono tracking-wide">
                        {o.codice}
                      </h3>
                      <Badge variant={o.attivo ? "success" : "default"}>
                        {o.attivo ? "attivo" : "disattivato"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => copyCode(o.codice)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Copia codice"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatSconto(o)}
                    </p>
                    {o.descrizione && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.descrizione}
                      </p>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground">
                      {o.validitaDa || o.validitaA ? (
                        <p>
                          Valida{o.validitaDa ? ` dal ${o.validitaDa}` : ""}
                          {o.validitaA ? ` al ${o.validitaA}` : ""}
                        </p>
                      ) : (
                        <p>Senza limite di data</p>
                      )}
                      {o.segmentiApplicabili.length > 0 && (
                        <p>Solo per: {o.segmentiApplicabili.join(", ")}</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Usi: {o.usiCorrenti}
                          {o.maxUsi ? ` / ${o.maxUsi}` : " (illimitati)"}
                        </span>
                        {o.maxUsi && (
                          <span className="text-muted-foreground">{usoPercent}%</span>
                        )}
                      </div>
                      {o.maxUsi && (
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${usoPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(o)}
                      >
                        {o.attivo ? "Disattiva" : "Attiva"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(o)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(o)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
          onClick={close}
        >
          <Card
            className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submit} className="p-6">
              <h2 className="mb-4 text-xl font-semibold">
                {editing === "new" ? "Nuova offerta" : "Modifica offerta"}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="off-cod">Codice *</Label>
                  <Input
                    id="off-cod"
                    value={form.codice}
                    onChange={(e) =>
                      setForm({ ...form, codice: e.target.value.toUpperCase() })
                    }
                    placeholder="RINASCITA10"
                    className="font-mono uppercase"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Solo A-Z, 0-9, - e _. Min 3 caratteri.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="off-tipo">Tipo *</Label>
                    <Select
                      id="off-tipo"
                      value={form.tipoSconto}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tipoSconto: e.target.value as TipoSconto,
                        })
                      }
                    >
                      <option value="percentuale">Percentuale (%)</option>
                      <option value="importo">Importo (€)</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="off-val">Valore *</Label>
                    <Input
                      id="off-val"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valoreSconto}
                      onChange={(e) =>
                        setForm({ ...form, valoreSconto: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="off-da">Valida dal</Label>
                    <Input
                      id="off-da"
                      type="date"
                      value={form.validitaDa}
                      onChange={(e) =>
                        setForm({ ...form, validitaDa: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="off-a">Valida al</Label>
                    <Input
                      id="off-a"
                      type="date"
                      value={form.validitaA}
                      onChange={(e) =>
                        setForm({ ...form, validitaA: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="off-max">Max usi (vuoto = illimitato)</Label>
                    <Input
                      id="off-max"
                      type="number"
                      min="1"
                      value={form.maxUsi}
                      onChange={(e) => setForm({ ...form, maxUsi: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Segmenti applicabili (vuoto = tutti)</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEGMENTI.map((seg) => (
                      <label
                        key={seg}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={form.segmentiApplicabili.has(seg)}
                          onChange={() => toggleSegmento(seg)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary"
                        />
                        {seg}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="off-desc">Descrizione</Label>
                  <Textarea
                    id="off-desc"
                    value={form.descrizione}
                    onChange={(e) =>
                      setForm({ ...form, descrizione: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={pending}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvataggio…" : "Salva"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
