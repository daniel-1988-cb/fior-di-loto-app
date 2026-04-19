"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Input, Textarea, Label, Select } from "@/components/ui";
import { updateBusinessSettings, type BusinessSettings } from "@/lib/actions/business";

const CURRENCIES = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollaro USA (USD)" },
  { value: "GBP", label: "Sterlina (GBP)" },
  { value: "CHF", label: "Franco svizzero (CHF)" },
];

export function PagamentiForm({ initial }: { initial: BusinessSettings | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const chipInputRef = useRef<HTMLInputElement>(null);
  const [chipDraft, setChipDraft] = useState("");

  const [form, setForm] = useState({
    iva_default: initial?.iva_default ?? 22,
    currency: initial?.currency ?? "EUR",
    metodi_pagamento: (initial?.metodi_pagamento ?? ["Contanti", "Carta", "Bancomat"]) as string[],
    policy_cancellazione: initial?.policy_cancellazione ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function addChip() {
    const v = chipDraft.trim();
    if (!v) return;
    if (form.metodi_pagamento.includes(v)) {
      setChipDraft("");
      return;
    }
    set("metodi_pagamento", [...form.metodi_pagamento, v]);
    setChipDraft("");
    chipInputRef.current?.focus();
  }

  function removeChip(idx: number) {
    set(
      "metodi_pagamento",
      form.metodi_pagamento.filter((_, i) => i !== idx)
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    startTransition(async () => {
      try {
        await updateBusinessSettings({
          iva_default: Number(form.iva_default),
          currency: form.currency,
          metodi_pagamento: form.metodi_pagamento,
          policy_cancellazione: form.policy_cancellazione.trim() || null,
        });
        setOk("Impostazioni salvate.");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Errore salvataggio");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="iva_default">IVA predefinita (%)</Label>
          <Input
            id="iva_default"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.iva_default}
            onChange={(e) => set("iva_default", Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="currency">Valuta</Label>
          <Select
            id="currency"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Metodi di pagamento accettati</Label>
        <div className="rounded-lg border border-input bg-card p-2">
          <div className="flex flex-wrap gap-2">
            {form.metodi_pagamento.map((m, i) => (
              <span
                key={`${m}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeChip(i)}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                  aria-label={`Rimuovi ${m}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={chipInputRef}
              value={chipDraft}
              onChange={(e) => setChipDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addChip();
                } else if (
                  e.key === "Backspace" &&
                  !chipDraft &&
                  form.metodi_pagamento.length > 0
                ) {
                  removeChip(form.metodi_pagamento.length - 1);
                }
              }}
              onBlur={addChip}
              placeholder={
                form.metodi_pagamento.length === 0
                  ? "Es. Contanti, Carta, Bancomat..."
                  : "Aggiungi e premi Invio"
              }
              className="min-w-[10rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Premi Invio o virgola per aggiungere una voce.
        </p>
      </div>

      <div>
        <Label htmlFor="policy_cancellazione">Policy di cancellazione</Label>
        <Textarea
          id="policy_cancellazione"
          rows={5}
          value={form.policy_cancellazione}
          onChange={(e) => set("policy_cancellazione", e.target.value)}
          placeholder="Es. Cancellazioni gratuite fino a 24 ore prima dell'appuntamento..."
          className="resize-y"
        />
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      {ok && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ok}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Salvataggio\u2026" : "Salva impostazioni"}
        </Button>
      </div>
    </form>
  );
}
