"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Card, Button, Input, Textarea, Label, Select } from "@/components/ui";
import { createVoucher } from "@/lib/actions/vouchers";
import { getServices } from "@/lib/actions/services";

type ServiceOption = { id: string; nome: string };

type FormState = {
  tipo: "importo" | "servizio" | "prodotto";
  valore: string;
  serviceId: string;
  descrizione: string;
  dataScadenza: string;
};

const EMPTY: FormState = {
  tipo: "importo",
  valore: "",
  serviceId: "",
  descrizione: "",
  dataScadenza: "",
};

export default function NuovoVoucherPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getServices()
      .then((data) =>
        setServices(
          (data ?? []).map((s: { id: string; nome: string }) => ({
            id: s.id,
            nome: s.nome,
          }))
        )
      )
      .catch(() => setServices([]));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valore = parseFloat(form.valore);
    if (isNaN(valore) || valore <= 0)
      return setError("Valore deve essere maggiore di zero");
    if (form.tipo === "servizio" && !form.serviceId)
      return setError("Seleziona un servizio per il voucher");

    startTransition(async () => {
      try {
        await createVoucher({
          tipo: form.tipo,
          valore,
          serviceId: form.tipo === "servizio" ? form.serviceId : undefined,
          descrizione: form.descrizione.trim() || undefined,
          dataScadenza: form.dataScadenza || undefined,
        });
        router.push("/catalogo/voucher");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore creazione");
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/catalogo/voucher"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Buoni
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo voucher</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Il codice viene generato automaticamente (formato FDL-XXXX).
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="voc-tipo">Tipo *</Label>
            <Select
              id="voc-tipo"
              value={form.tipo}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo: e.target.value as FormState["tipo"],
                })
              }
            >
              <option value="importo">Importo (€)</option>
              <option value="servizio">Servizio specifico</option>
              <option value="prodotto">Prodotto specifico</option>
            </Select>
          </div>

          {form.tipo === "servizio" && (
            <div>
              <Label htmlFor="voc-svc">Servizio *</Label>
              <Select
                id="voc-svc"
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
                required
              >
                <option value="">— Seleziona —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="voc-valore">Valore (€) *</Label>
              <Input
                id="voc-valore"
                type="number"
                min="0.01"
                step="0.01"
                value={form.valore}
                onChange={(e) => setForm({ ...form, valore: e.target.value })}
                placeholder="50.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="voc-scad">Scadenza</Label>
              <Input
                id="voc-scad"
                type="date"
                value={form.dataScadenza}
                onChange={(e) =>
                  setForm({ ...form, dataScadenza: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="voc-descr">Descrizione</Label>
            <Textarea
              id="voc-descr"
              value={form.descrizione}
              onChange={(e) =>
                setForm({ ...form, descrizione: e.target.value })
              }
              rows={3}
              placeholder="Es. Buono regalo compleanno, valido su tutti i servizi viso."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/catalogo/voucher">
              <Button type="button" variant="outline" disabled={isPending}>
                Annulla
              </Button>
            </Link>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Creazione..." : "Crea voucher"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
