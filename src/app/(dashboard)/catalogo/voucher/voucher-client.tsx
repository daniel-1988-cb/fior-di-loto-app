"use client";

import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import {
  CatalogoListView,
  type CatalogoItem,
} from "@/components/catalogo/catalogo-list-view";
import { deleteVoucher } from "@/lib/actions/vouchers";
import { formatCurrency } from "@/lib/utils";

type Voucher = {
  id: string;
  codice: string;
  tipo: string;
  valore: number;
  usato: boolean;
  data_scadenza: string | null;
  descrizione: string | null;
  created_at: string;
};

function isExpired(v: Voucher): boolean {
  return !!v.data_scadenza && new Date(v.data_scadenza) < new Date();
}

function toItem(v: Voucher): CatalogoItem {
  const badges: CatalogoItem["badges"] = [
    { label: v.tipo, variant: "outline" },
  ];
  if (v.usato) badges.push({ label: "Usato", variant: "default" });
  else if (isExpired(v)) badges.push({ label: "Scaduto", variant: "danger" });
  else badges.push({ label: "Valido", variant: "success" });

  return {
    id: v.id,
    nome: v.codice,
    meta:
      (v.descrizione ?? "") +
      (v.data_scadenza
        ? ` · scade ${new Date(v.data_scadenza + "T00:00:00").toLocaleDateString("it-IT")}`
        : ""),
    prezzo: Number(v.valore),
    attivo: !v.usato && !isExpired(v),
    badges,
  };
}

export function VoucherClient({ vouchers }: { vouchers: Voucher[] }) {
  const router = useRouter();

  const active = vouchers.filter((v) => !v.usato && !isExpired(v));
  const used = vouchers.filter((v) => v.usato);
  const expired = vouchers.filter((v) => !v.usato && isExpired(v));
  const totalActive = active.reduce((s, v) => s + Number(v.valore), 0);

  function openNew() {
    router.push("/catalogo/voucher/nuovo");
  }

  function openEdit(item: CatalogoItem) {
    router.push(`/catalogo/voucher/${item.id}/modifica`);
  }

  async function handleDelete(item: CatalogoItem) {
    try {
      await deleteVoucher(item.id);
      router.refresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Impossibile eliminare (voucher già usato?)"
      );
    }
  }

  const items = vouchers.map(toItem);

  const stats = (
    <section className="grid gap-3 md:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Totale emessi
        </p>
        <p className="mt-1 text-2xl font-bold">{vouchers.length}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Validi
        </p>
        <p className="mt-1 text-2xl font-bold text-success">{active.length}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Valore attivo
        </p>
        <p className="mt-1 text-2xl font-bold">
          {formatCurrency(totalActive)}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Usati / Scaduti
        </p>
        <p className="mt-1 text-2xl font-bold">
          {used.length} <Badge variant="default">/</Badge> {expired.length}
        </p>
      </Card>
    </section>
  );

  return (
    <CatalogoListView
      items={items}
      title="Buoni"
      subtitle="Template e istanze di voucher emessi dal centro."
      searchPlaceholder="Cerca per codice o descrizione..."
      newButtonLabel="Nuovo voucher"
      emptyMessage="Ancora nessun voucher emesso."
      emptyIcon={<Gift className="h-6 w-6" />}
      onNew={openNew}
      onEdit={openEdit}
      onDelete={handleDelete}
      headerExtra={stats}
    />
  );
}
