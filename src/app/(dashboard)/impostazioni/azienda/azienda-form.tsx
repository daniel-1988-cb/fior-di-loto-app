"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, X, CheckCircle2, AlertCircle, ImageIcon } from "lucide-react";
import { Button, Input, Textarea, Label, Select } from "@/components/ui";
import { updateBusinessSettings, type BusinessSettings } from "@/lib/actions/business";

const CURRENCIES = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollaro USA (USD)" },
  { value: "GBP", label: "Sterlina (GBP)" },
  { value: "CHF", label: "Franco svizzero (CHF)" },
];

const TIMEZONES = [
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "UTC", label: "UTC" },
];

function isValidUrl(s: string): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function AziendaForm({ initial }: { initial: BusinessSettings | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const chipInputRef = useRef<HTMLInputElement>(null);
  const [chipDraft, setChipDraft] = useState("");

  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    email: initial?.email ?? "",
    telefono: initial?.telefono ?? "",
    sito_web: initial?.sito_web ?? "",
    indirizzo: initial?.indirizzo ?? "",
    citta: initial?.citta ?? "",
    cap: initial?.cap ?? "",
    provincia: initial?.provincia ?? "",
    paese: initial?.paese ?? "IT",
    p_iva: initial?.p_iva ?? "",
    codice_fiscale: initial?.codice_fiscale ?? "",
    iva_default: initial?.iva_default ?? 22,
    logo_url: initial?.logo_url ?? "",
    currency: initial?.currency ?? "EUR",
    timezone: initial?.timezone ?? "Europe/Rome",
    metodi_pagamento: (initial?.metodi_pagamento ?? ["Contanti", "Carta", "Bancomat"]) as string[],
    policy_cancellazione: initial?.policy_cancellazione ?? "",
    google_review_url: initial?.google_review_url ?? "",
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
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          sito_web: form.sito_web.trim() || null,
          indirizzo: form.indirizzo.trim() || null,
          citta: form.citta.trim() || null,
          cap: form.cap.trim() || null,
          provincia: form.provincia.trim() || null,
          paese: form.paese.trim() || "IT",
          p_iva: form.p_iva.trim() || null,
          codice_fiscale: form.codice_fiscale.trim() || null,
          iva_default: Number(form.iva_default),
          logo_url: form.logo_url.trim() || null,
          currency: form.currency,
          timezone: form.timezone,
          metodi_pagamento: form.metodi_pagamento,
          policy_cancellazione: form.policy_cancellazione.trim() || null,
          google_review_url: form.google_review_url.trim() || null,
        });
        setOk("Impostazioni salvate.");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Errore salvataggio");
      }
    });
  }

  const showLogoPreview = isValidUrl(form.logo_url);

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Anagrafica */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Anagrafica
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="nome">Nome attivit&agrave; *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Es. Fior di Loto Centro Estetico"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@esempio.it"
            />
          </div>
          <div>
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              placeholder="0874 1950632"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sito_web">Sito web</Label>
            <Input
              id="sito_web"
              type="url"
              value={form.sito_web}
              onChange={(e) => set("sito_web", e.target.value)}
              placeholder="https://www.esempio.it"
            />
          </div>
        </div>
      </section>

      {/* Sede */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sede
        </h2>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input
              id="indirizzo"
              value={form.indirizzo}
              onChange={(e) => set("indirizzo", e.target.value)}
              placeholder="Via, numero civico"
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="citta">Citt&agrave;</Label>
            <Input
              id="citta"
              value={form.citta}
              onChange={(e) => set("citta", e.target.value)}
              placeholder="Campobasso"
            />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="cap">CAP</Label>
            <Input
              id="cap"
              maxLength={5}
              value={form.cap}
              onChange={(e) => set("cap", e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="86100"
            />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="provincia">Prov.</Label>
            <Input
              id="provincia"
              maxLength={2}
              value={form.provincia}
              onChange={(e) => set("provincia", e.target.value.toUpperCase().slice(0, 2))}
              placeholder="CB"
            />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="paese">Paese</Label>
            <Input
              id="paese"
              maxLength={2}
              value={form.paese}
              onChange={(e) => set("paese", e.target.value.toUpperCase().slice(0, 2))}
              placeholder="IT"
            />
          </div>
        </div>
      </section>

      {/* Fiscale */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fiscale
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="p_iva">Partita IVA</Label>
            <Input
              id="p_iva"
              maxLength={11}
              value={form.p_iva}
              onChange={(e) => set("p_iva", e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="11 cifre"
            />
          </div>
          <div>
            <Label htmlFor="codice_fiscale">Codice fiscale</Label>
            <Input
              id="codice_fiscale"
              maxLength={16}
              value={form.codice_fiscale}
              onChange={(e) =>
                set(
                  "codice_fiscale",
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 16)
                )
              }
              placeholder="16 caratteri"
            />
          </div>
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
        </div>
      </section>

      {/* Brand */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Brand
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://..."
            />
            {form.logo_url && (
              <div className="mt-3 flex items-center gap-3">
                {showLogoPreview ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={form.logo_url}
                      alt="Logo"
                      fill
                      sizes="64px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {showLogoPreview ? "Anteprima logo" : "URL non valido"}
                </p>
              </div>
            )}
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
          <div>
            <Label htmlFor="timezone">Fuso orario</Label>
            <Select
              id="timezone"
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Operativit&agrave; */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Operativit&agrave;
        </h2>

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
            rows={4}
            value={form.policy_cancellazione}
            onChange={(e) => set("policy_cancellazione", e.target.value)}
            placeholder="Es. Cancellazioni gratuite fino a 24 ore prima dell'appuntamento..."
            className="resize-y"
          />
        </div>
      </section>

      {/* Recensioni Google */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recensioni Google
        </h2>
        <div>
          <Label htmlFor="google_review_url">
            URL diretto alla pagina recensioni Google Business
          </Label>
          <Input
            id="google_review_url"
            type="url"
            value={form.google_review_url}
            onChange={(e) => set("google_review_url", e.target.value)}
            placeholder="https://g.page/r/CbE.../review"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Usato per reindirizzare i clienti che lasciano 4-5 stelle sulla
            recensione pubblica Google. Se vuoto, le recensioni restano interne.
            Lo trovi dal pannello Google Business Profile (sezione Recensioni
            &rarr; Ottieni pi&ugrave; recensioni).
          </p>
        </div>
      </section>

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

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Salvataggio\u2026" : "Salva impostazioni"}
        </Button>
      </div>
    </form>
  );
}
