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
import { Plus, Zap, Edit3, Trash2 } from "lucide-react";
import {
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRuleActive,
} from "@/lib/actions/dynamic-pricing";
import {
  type PricingRule,
  type AdjustType,
  type AdjustKind,
} from "@/lib/types/pricing";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

export type ServiceLite = {
  id: string;
  nome: string;
  categoria: string;
};

const GIORNI_LABELS: Record<number, { short: string; long: string }> = {
  0: { short: "Dom", long: "Domenica" },
  1: { short: "Lun", long: "Lunedi" },
  2: { short: "Mar", long: "Martedi" },
  3: { short: "Mer", long: "Mercoledi" },
  4: { short: "Gio", long: "Giovedi" },
  5: { short: "Ven", long: "Venerdi" },
  6: { short: "Sab", long: "Sabato" },
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type FormState = {
  nome: string;
  descrizione: string;
  adjustType: AdjustType;
  adjustKind: AdjustKind;
  adjustValue: string;
  giorniSettimana: Set<number>;
  oraInizio: string;
  oraFine: string;
  serviziTarget: Set<string>;
  dataInizio: string;
  dataFine: string;
  priorita: string;
  attivo: boolean;
};

const EMPTY: FormState = {
  nome: "",
  descrizione: "",
  adjustType: "sconto",
  adjustKind: "percentuale",
  adjustValue: "",
  giorniSettimana: new Set<number>(),
  oraInizio: "",
  oraFine: "",
  serviziTarget: new Set<string>(),
  dataInizio: "",
  dataFine: "",
  priorita: "100",
  attivo: true,
};

function formatAdjust(rule: PricingRule): string {
  const sign = rule.adjustType === "sconto" ? "-" : "+";
  if (rule.adjustKind === "percentuale") {
    return `${sign}${rule.adjustValue}%`;
  }
  return `${sign}${rule.adjustValue.toFixed(2)} EUR`;
}

function formatGiorni(giorni: number[]): string {
  if (giorni.length === 0) return "Tutti i giorni";
  if (giorni.length === 7) return "Tutti i giorni";

  const sorted = [...giorni].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    ranges.push(
      start === prev
        ? GIORNI_LABELS[start].short
        : `${GIORNI_LABELS[start].short}-${GIORNI_LABELS[prev].short}`
    );
    start = sorted[i];
    prev = sorted[i];
  }
  ranges.push(
    start === prev
      ? GIORNI_LABELS[start].short
      : `${GIORNI_LABELS[start].short}-${GIORNI_LABELS[prev].short}`
  );
  return ranges.join(", ");
}

function formatFascia(rule: PricingRule): string {
  const giorni = formatGiorni(rule.giorniSettimana);
  if (!rule.oraInizio && !rule.oraFine) return giorni;
  const ini = rule.oraInizio ?? "00:00";
  const fin = rule.oraFine ?? "23:59";
  return `${giorni} ${ini}-${fin}`;
}

function formatRange(rule: PricingRule): string | null {
  if (!rule.dataInizio && !rule.dataFine) return null;
  if (rule.dataInizio && rule.dataFine)
    return `Attiva ${rule.dataInizio} > ${rule.dataFine}`;
  if (rule.dataInizio) return `Dal ${rule.dataInizio}`;
  return `Fino al ${rule.dataFine}`;
}

export function TariffeClient({
  rules,
  services,
}: {
  rules: PricingRule[];
  services: ServiceLite[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  function openNew() {
    setForm({
      ...EMPTY,
      giorniSettimana: new Set<number>(),
      serviziTarget: new Set<string>(),
    });
    setError(null);
    setEditing("new");
  }

  function openEdit(r: PricingRule) {
    setForm({
      nome: r.nome,
      descrizione: r.descrizione ?? "",
      adjustType: r.adjustType,
      adjustKind: r.adjustKind,
      adjustValue: String(r.adjustValue),
      giorniSettimana: new Set(r.giorniSettimana),
      oraInizio: r.oraInizio ?? "",
      oraFine: r.oraFine ?? "",
      serviziTarget: new Set(r.serviziTarget),
      dataInizio: r.dataInizio ?? "",
      dataFine: r.dataFine ?? "",
      priorita: String(r.priorita),
      attivo: r.attivo,
    });
    setError(null);
    setEditing(r.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  async function handleDelete(r: PricingRule) {
    const ok = await confirm({ title: `Eliminare la regola "${r.nome}"?`, confirmLabel: "Elimina", variant: "destructive" });
    if (!ok) return;
    const res = await deletePricingRule(r.id);
    if (!res.ok) {
      toast.error(res.error ?? "Errore eliminazione");
      return;
    }
    router.refresh();
  }

  async function handleToggle(r: PricingRule) {
    await togglePricingRuleActive(r.id, !r.attivo);
    router.refresh();
  }

  function toggleGiorno(g: number) {
    setForm((prev) => {
      const next = new Set(prev.giorniSettimana);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return { ...prev, giorniSettimana: next };
    });
  }

  function toggleServizio(id: string) {
    setForm((prev) => {
      const next = new Set(prev.serviziTarget);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, serviziTarget: next };
    });
  }

  function clearServizi() {
    setForm((prev) => ({ ...prev, serviziTarget: new Set<string>() }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const val = parseFloat(form.adjustValue);
    const prio = parseInt(form.priorita, 10);

    if (!form.nome.trim()) return setError("Nome obbligatorio");
    if (isNaN(val) || val < 0) return setError("Valore non valido");
    if (form.adjustKind === "percentuale" && val > 100)
      return setError("Percentuale > 100");
    if (form.oraInizio && !HHMM_RE.test(form.oraInizio))
      return setError("Ora inizio non valida (HH:MM)");
    if (form.oraFine && !HHMM_RE.test(form.oraFine))
      return setError("Ora fine non valida (HH:MM)");
    if (form.oraInizio && form.oraFine && form.oraInizio >= form.oraFine)
      return setError("Ora inizio deve precedere ora fine");
    if (!Number.isInteger(prio) || prio < 0)
      return setError("Priorita non valida");
    if (form.dataInizio && form.dataFine && form.dataInizio > form.dataFine)
      return setError("Data inizio dopo data fine");

    const payload = {
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim() || null,
      adjustType: form.adjustType,
      adjustKind: form.adjustKind,
      adjustValue: val,
      giorniSettimana: Array.from(form.giorniSettimana),
      oraInizio: form.oraInizio || null,
      oraFine: form.oraFine || null,
      serviziTarget: Array.from(form.serviziTarget),
      dataInizio: form.dataInizio || null,
      dataFine: form.dataFine || null,
      priorita: prio,
      attivo: form.attivo,
    };

    start(async () => {
      try {
        if (editing === "new") {
          await createPricingRule(payload);
        } else if (editing) {
          await updatePricingRule(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  const attive = rules.filter((r) => r.attivo).length;

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tariffe smart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rules.length === 0
              ? "Configura sconti e maggiorazioni per fasce orarie e giorni."
              : `${attive} attive su ${rules.length} totali. Priorita piu bassa = applicata prima.`}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nuova regola
        </Button>
      </header>

      {rules.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessuna regola di tariffa</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crea regole per applicare sconti o maggiorazioni in fasce specifiche.
            Esempio: -10% lun&#8209;mer 09:00&#8209;12:00.
          </p>
          <div className="mt-5">
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Aggiungi prima regola
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((r) => {
            const fascia = formatFascia(r);
            const range = formatRange(r);
            const targetCount = r.serviziTarget.length;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{r.nome}</h3>
                      <Badge variant={r.attivo ? "success" : "default"}>
                        {r.attivo ? "attiva" : "disattivata"}
                      </Badge>
                      <Badge
                        variant={r.adjustType === "sconto" ? "primary" : "warning"}
                      >
                        {r.adjustType}
                      </Badge>
                      <Badge variant="outline">priorita {r.priorita}</Badge>
                    </div>
                    <p
                      className={
                        "mt-1 text-2xl font-bold " +
                        (r.adjustType === "sconto" ? "text-primary" : "text-warning")
                      }
                    >
                      {formatAdjust(r)}
                    </p>
                    {r.descrizione && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {r.descrizione}
                      </p>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Fascia:</span>{" "}
                        {fascia}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Servizi:</span>{" "}
                        {targetCount === 0
                          ? "Tutti i servizi"
                          : `${targetCount} selezionati`}
                      </p>
                      {range && <p>{range}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(r)}
                      >
                        {r.attivo ? "Disattiva" : "Attiva"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(r)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(r)}
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
                {editing === "new" ? "Nuova regola" : "Modifica regola"}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-nome">Nome *</Label>
                  <Input
                    id="rule-nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Sconto orario felice mattina"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="rule-desc">Descrizione</Label>
                  <Textarea
                    id="rule-desc"
                    value={form.descrizione}
                    onChange={(e) =>
                      setForm({ ...form, descrizione: e.target.value })
                    }
                    rows={2}
                    placeholder="Riempi le fasce piu vuote del lunedi mattina"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-type">Tipo *</Label>
                    <Select
                      id="rule-type"
                      value={form.adjustType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          adjustType: e.target.value as AdjustType,
                        })
                      }
                    >
                      <option value="sconto">Sconto (riduce prezzo)</option>
                      <option value="maggiorazione">
                        Maggiorazione (aumenta prezzo)
                      </option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-kind">Modalita *</Label>
                    <Select
                      id="rule-kind"
                      value={form.adjustKind}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          adjustKind: e.target.value as AdjustKind,
                        })
                      }
                    >
                      <option value="percentuale">Percentuale (%)</option>
                      <option value="fisso">Importo fisso (EUR)</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rule-val">
                    Valore * ({form.adjustKind === "percentuale" ? "%" : "EUR"})
                  </Label>
                  <Input
                    id="rule-val"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.adjustValue}
                    onChange={(e) =>
                      setForm({ ...form, adjustValue: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Giorni della settimana (vuoto = tutti)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((g) => (
                      <label
                        key={g}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={form.giorniSettimana.has(g)}
                          onChange={() => toggleGiorno(g)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary"
                        />
                        {GIORNI_LABELS[g].long}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-ora-ini">Ora inizio</Label>
                    <Input
                      id="rule-ora-ini"
                      type="time"
                      value={form.oraInizio}
                      onChange={(e) =>
                        setForm({ ...form, oraInizio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-ora-fin">Ora fine</Label>
                    <Input
                      id="rule-ora-fin"
                      type="time"
                      value={form.oraFine}
                      onChange={(e) =>
                        setForm({ ...form, oraFine: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="!mb-0">
                      Servizi target ({form.serviziTarget.size === 0
                        ? "tutti"
                        : `${form.serviziTarget.size} selezionati`})
                    </Label>
                    {form.serviziTarget.size > 0 && (
                      <button
                        type="button"
                        onClick={clearServizi}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Applica a tutti
                      </button>
                    )}
                  </div>
                  {services.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nessun servizio attivo nel catalogo.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2">
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {services.map((s) => (
                          <label
                            key={s.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={form.serviziTarget.has(s.id)}
                              onChange={() => toggleServizio(s.id)}
                              className="h-3.5 w-3.5 rounded border-border accent-primary"
                            />
                            <span className="truncate">{s.nome}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {s.categoria}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-data-ini">Data inizio</Label>
                    <Input
                      id="rule-data-ini"
                      type="date"
                      value={form.dataInizio}
                      onChange={(e) =>
                        setForm({ ...form, dataInizio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-data-fin">Data fine</Label>
                    <Input
                      id="rule-data-fin"
                      type="date"
                      value={form.dataFine}
                      onChange={(e) =>
                        setForm({ ...form, dataFine: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rule-prio">Priorita</Label>
                    <Input
                      id="rule-prio"
                      type="number"
                      min="0"
                      value={form.priorita}
                      onChange={(e) =>
                        setForm({ ...form, priorita: e.target.value })
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Numero piu basso = applicata prima.
                    </p>
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.attivo}
                        onChange={(e) =>
                          setForm({ ...form, attivo: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Regola attiva
                    </label>
                  </div>
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
                  {pending ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
