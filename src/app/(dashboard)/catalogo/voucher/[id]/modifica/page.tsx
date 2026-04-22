"use client";

import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Card, Button, Input, Textarea, Label, Badge } from "@/components/ui";
import {
  getVoucherById,
  updateVoucherCatalog,
} from "@/lib/actions/vouchers-catalog";
import { formatCurrency } from "@/lib/utils";

type FormState = {
  valore: string;
  descrizione: string;
  dataScadenza: string;
};

type Voucher = {
  id: string;
  codice: string;
  tipo: string;
  valore: number | string;
  descrizione: string | null;
  data_scadenza: string | null;
  usato: boolean;
};

export default function ModificaVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [form, setForm] = useState<FormState>({
    valore: "",
    descrizione: "",
    dataScadenza: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getVoucherById(id)
      .then((v) => {
        if (v) {
          setVoucher(v as Voucher);
          setForm({
            valore: String(v.valore),
            descrizione: v.descrizione ?? "",
            dataScadenza: v.data_scadenza ?? "",
          });
        }
      })
      .finally(() => setLoadingData(false));
  }, [id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valore = parseFloat(form.valore);
    if (isNaN(valore) || valore <= 0)
      return setError("Valore deve essere maggiore di zero");

    startTransition(async () => {
      const res = await updateVoucherCatalog(id, {
        valore,
        descrizione: form.descrizione.trim() || null,
        dataScadenza: form.dataScadenza || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore salvataggio");
        return;
      }
      router.push("/catalogo/voucher");
      router.refresh();
    });
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="max-w-2xl">
        <Link
          href="/catalogo/voucher"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Buoni
        </Link>
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Voucher non trovato.
        </Card>
      </div>
    );
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
        <h1 className="text-3xl font-bold tracking-tight">
          Modifica voucher
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {voucher.codice} · <Badge variant="outline">{voucher.tipo}</Badge>
          {voucher.usato && (
            <>
              {" · "}
              <Badge variant="default">Già utilizzato</Badge>
            </>
          )}
        </p>
      </div>

      {voucher.usato && (
        <Card className="mb-4 border-warning/30 bg-warning/10 p-4 text-sm">
          Questo voucher è già stato utilizzato e non può essere modificato.
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="voc-valore">Valore (€) *</Label>
              <Input
                id="voc-valore"
                type="number"
                min="0.01"
                step="0.01"
                value={form.valore}
                onChange={(e) =>
                  setForm({ ...form, valore: e.target.value })
                }
                disabled={voucher.usato}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Attuale: {formatCurrency(Number(voucher.valore))}
              </p>
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
                disabled={voucher.usato}
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
              disabled={voucher.usato}
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
            <Button
              type="submit"
              disabled={isPending || voucher.usato}
            >
              <Save className="h-4 w-4" />
              {isPending ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
