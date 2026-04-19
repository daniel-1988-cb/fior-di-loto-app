"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Gift } from "lucide-react";
import { Button, Card, Input, Textarea, Label, Select } from "@/components/ui";
import { createReward } from "@/lib/actions/loyalty";

const CATEGORIE = [
  { value: "sconto", label: "Sconto" },
  { value: "prodotto", label: "Prodotto omaggio" },
  { value: "servizio", label: "Servizio" },
  { value: "esperienza", label: "Esperienza" },
  { value: "regalo", label: "Regalo" },
];

export default function NuovoPremioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descrizione: "",
    costo_punti: "100",
    categoria: "sconto",
    scadenza_giorni: "",
    attivo: true,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const costo = Number(form.costo_punti);
      if (!Number.isFinite(costo) || costo < 1) {
        throw new Error("Il costo punti deve essere almeno 1");
      }
      const scad = form.scadenza_giorni.trim()
        ? Number(form.scadenza_giorni)
        : null;
      await createReward({
        nome: form.nome,
        descrizione: form.descrizione || undefined,
        costo_punti: costo,
        categoria: form.categoria,
        scadenza_giorni: scad,
        attivo: form.attivo,
      });
      router.push("/impostazioni/fidelizzazione");
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
          href="/impostazioni/fidelizzazione"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo premio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiungi un premio al catalogo che le clienti potranno riscattare
          con i loro punti.
        </p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="nome">Nome premio *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Sconto 10€ sul prossimo trattamento"
            />
          </div>

          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              rows={4}
              value={form.descrizione}
              onChange={(e) =>
                setForm({ ...form, descrizione: e.target.value })
              }
              placeholder="Dettagli, condizioni d'uso, esclusioni…"
              className="resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="costo_punti">Costo in punti *</Label>
              <Input
                id="costo_punti"
                type="number"
                min="1"
                required
                value={form.costo_punti}
                onChange={(e) =>
                  setForm({ ...form, costo_punti: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                id="categoria"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
              >
                {CATEGORIE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="scadenza_giorni">Scadenza (giorni)</Label>
              <Input
                id="scadenza_giorni"
                type="number"
                min="1"
                placeholder="Nessuna scadenza"
                value={form.scadenza_giorni}
                onChange={(e) =>
                  setForm({ ...form, scadenza_giorni: e.target.value })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Validità del premio dopo il riscatto.
              </p>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.attivo}
                  onChange={(e) =>
                    setForm({ ...form, attivo: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Premio attivo (riscattabile dalle clienti)
              </label>
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Link href="/impostazioni/fidelizzazione">
              <Button type="button" variant="outline">
                Annulla
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Salvataggio…" : "Crea premio"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-dashed p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Gift className="h-4 w-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            Suggerimento: parti con 3-5 premi accessibili (sconti, omaggi piccoli)
            e aggiungi premi più ambiziosi (trattamenti, esperienze) per i tier
            Gold e VIP.
          </div>
        </div>
      </Card>
    </div>
  );
}
