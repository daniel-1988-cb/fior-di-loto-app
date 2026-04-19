"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Variable } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Textarea,
  Label,
  Select,
  Badge,
} from "@/components/ui";
import { createTemplate } from "@/lib/actions/messages";
import { VALID_CHANNELS } from "@/lib/constants/messages";

const CATEGORIE_SUGGERITE = [
  "reminder",
  "auguri",
  "post-trattamento",
  "promo",
];

const VARIABILI = [
  "{{nome}}",
  "{{cognome}}",
  "{{servizio}}",
  "{{data}}",
  "{{ora}}",
  "{{centro}}",
];

const MAX_CONTENUTO = 4000;

const CANALE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  push: "Push",
};

export default function NuovoTemplatePage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    canale: "whatsapp",
    categoria: "",
    contenuto: "",
    attivo: true,
  });

  function insertVariable(variable: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setForm((f) => ({ ...f, contenuto: f.contenuto + variable }));
      return;
    }
    const start = ta.selectionStart ?? form.contenuto.length;
    const end = ta.selectionEnd ?? form.contenuto.length;
    const next =
      form.contenuto.slice(0, start) + variable + form.contenuto.slice(end);
    if (next.length > MAX_CONTENUTO) return;
    setForm((f) => ({ ...f, contenuto: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + variable.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await createTemplate({
        nome: form.nome,
        canale: form.canale,
        categoria: form.categoria || undefined,
        contenuto: form.contenuto,
        attivo: form.attivo,
      });
      router.push("/impostazioni/template-messaggi");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link
          href="/impostazioni/template-messaggi"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea un modello riutilizzabile per messaggi automatici, promemoria o
          campagne.
        </p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Promemoria appuntamento 24h"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="canale">Canale *</Label>
              <Select
                id="canale"
                required
                value={form.canale}
                onChange={(e) => setForm({ ...form, canale: e.target.value })}
              >
                {VALID_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CANALE_LABELS[c] ?? c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
                list="categorie-suggerite"
                placeholder="reminder, auguri, post-trattamento, promo…"
              />
              <datalist id="categorie-suggerite">
                {CATEGORIE_SUGGERITE.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <Label htmlFor="contenuto">Contenuto *</Label>
            <Textarea
              id="contenuto"
              ref={textareaRef}
              required
              rows={10}
              maxLength={MAX_CONTENUTO}
              value={form.contenuto}
              onChange={(e) =>
                setForm({ ...form, contenuto: e.target.value })
              }
              placeholder={`Ciao {{nome}}, ti ricordo l'appuntamento di {{data}} alle {{ora}} per {{servizio}}.\n\nA presto,\n{{centro}}`}
              className="resize-y"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {form.contenuto.length.toLocaleString("it-IT")} / {MAX_CONTENUTO} caratteri
            </p>

            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Variable className="h-3.5 w-3.5" />
                Variabili disponibili
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABILI.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="cursor-pointer"
                    aria-label={`Inserisci ${v}`}
                  >
                    <Badge variant="primary" className="hover:opacity-80">
                      {v}
                    </Badge>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Clicca su una variabile per inserirla nel testo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="attivo"
              type="checkbox"
              checked={form.attivo}
              onChange={(e) => setForm({ ...form, attivo: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="attivo" className="mb-0">
              Template attivo
            </Label>
          </div>

          {err && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Link href="/impostazioni/template-messaggi">
              <Button type="button" variant="outline">
                Annulla
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Salvataggio…" : "Salva template"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
