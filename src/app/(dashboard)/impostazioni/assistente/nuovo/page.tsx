"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { Button, Card, Input, Textarea, Label, Select } from "@/components/ui";
import { createDocument } from "@/lib/actions/ai-assistant";

const CATEGORIE = [
  { value: "generale", label: "Generale" },
  { value: "protocollo", label: "Protocollo trattamento" },
  { value: "trattamento", label: "Trattamento" },
  { value: "prodotto", label: "Prodotto" },
  { value: "procedura", label: "Procedura operativa" },
  { value: "policy", label: "Policy interna" },
];

const VISIBILITA = [
  { value: "tutti", label: "Visibile a tutti (incluse operatrici)" },
  { value: "operatrice", label: "Solo operatrici" },
  { value: "admin", label: "Solo amministratori" },
];

export default function NuovoDocumentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descrizione: "",
    contenuto: "",
    categoria: "generale",
    visibilita: "tutti",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await createDocument({
        nome: form.nome,
        descrizione: form.descrizione || undefined,
        contenuto: form.contenuto,
        categoria: form.categoria,
        visibilita: form.visibilita,
      });
      router.push("/impostazioni/assistente");
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
          href="/impostazioni/assistente"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo documento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiungi protocolli, procedure, policy o specifiche prodotto.
          L&apos;assistente userà questo testo per rispondere alle domande dello staff.
        </p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="nome">Nome documento *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Protocollo trattamento viso detox"
            />
          </div>

          <div>
            <Label htmlFor="descrizione">Descrizione breve</Label>
            <Input
              id="descrizione"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              placeholder="Riga breve per identificarlo in elenco"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                id="categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visibilita">Visibilità</Label>
              <Select
                id="visibilita"
                value={form.visibilita}
                onChange={(e) => setForm({ ...form, visibilita: e.target.value })}
              >
                {VISIBILITA.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="contenuto">Contenuto *</Label>
            <Textarea
              id="contenuto"
              required
              rows={16}
              value={form.contenuto}
              onChange={(e) => setForm({ ...form, contenuto: e.target.value })}
              placeholder={`Incolla qui il testo del documento.

Suggerimento: usa sezioni chiare con titoli, elenchi puntati per i passi del protocollo e specifica dosaggi/tempi quando rilevante.`}
              className="resize-y"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Limite 50.000 caratteri · {form.contenuto.length.toLocaleString("it-IT")} usati
            </p>
          </div>

          {err && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Link href="/impostazioni/assistente">
              <Button type="button" variant="outline">
                Annulla
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Salvataggio…" : "Salva documento"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-dashed p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            Suggerimento: carica un documento per categoria (protocolli, procedure, policy,
            prodotti). L&apos;assistente combinerà automaticamente il contesto quando lo staff
            pone domande.
          </div>
        </div>
      </Card>
    </div>
  );
}
