"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  X,
  Package,
  Calendar as CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Badge,
} from "@/components/ui";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  receivePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderWithItems,
} from "@/lib/actions/purchase-orders";
import { VALID_STATI_PO, type PoStato } from "@/lib/constants/purchase-orders";

// ============================================
// TYPES
// ============================================

type SupplierOption = { id: string; nome: string };
type ProductOption = { id: string; nome: string; prezzo: number };

type NewRow = {
  productId: string | ""; // "" = manual entry (prodotto non in catalogo)
  nomeProdotto: string;
  quantita: string;
  costoUnitario: string;
};

const EMPTY_NEW_FORM = {
  supplierId: "",
  numeroOrdine: "",
  dataOrdine: new Date().toISOString().slice(0, 10),
  dataConsegnaAttesa: "",
  note: "",
};

const EMPTY_ROW: NewRow = {
  productId: "",
  nomeProdotto: "",
  quantita: "1",
  costoUnitario: "0",
};

const STATO_LABELS: Record<PoStato, string> = {
  in_attesa: "In attesa",
  in_transito: "In transito",
  ricevuto: "Ricevuto",
  cancellato: "Cancellato",
};

const STATO_VARIANTS: Record<
  PoStato,
  "default" | "primary" | "outline" | "success" | "warning" | "danger"
> = {
  in_attesa: "outline",
  in_transito: "warning",
  ricevuto: "success",
  cancellato: "danger",
};

// ============================================
// MAIN
// ============================================

export function OrdiniClient({
  orders,
  suppliers,
  products,
}: {
  orders: PurchaseOrder[];
  suppliers: SupplierOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [filterStato, setFilterStato] = useState<PoStato | "">("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrderWithItems | null>(null);

  const filtered = useMemo(() => {
    if (!filterStato) return orders;
    return orders.filter((o) => o.stato === filterStato);
  }, [orders, filterStato]);

  // Stats
  const stats = useMemo(() => {
    const inAttesa = orders.filter(
      (o) => o.stato === "in_attesa" || o.stato === "in_transito"
    );
    const valoreInAttesa = inAttesa.reduce((s, o) => s + o.importoTotale, 0);
    const ora = new Date();
    const meseStart = `${ora.getFullYear()}-${String(ora.getMonth() + 1).padStart(2, "0")}-01`;
    const ricevutiMese = orders.filter(
      (o) => o.stato === "ricevuto" && o.dataConsegnaEffettiva && o.dataConsegnaEffettiva >= meseStart
    ).length;
    return { inAttesaCount: inAttesa.length, valoreInAttesa, ricevutiMese };
  }, [orders]);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetailOrder(null);
    try {
      const data = await getPurchaseOrder(id);
      if (!data) {
        alert("Ordine non trovato.");
        setDetailId(null);
        return;
      }
      setDetailOrder(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore caricamento dettagli");
      setDetailId(null);
    }
  }

  function closeDetail() {
    setDetailId(null);
    setDetailOrder(null);
  }

  async function refreshDetail() {
    if (!detailId) return;
    try {
      const data = await getPurchaseOrder(detailId);
      if (data) setDetailOrder(data);
    } catch {
      // ignore — lista refresh comunque
    }
  }

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ordini di stock</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Riordini dai fornitori e ricezione merce.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} disabled={suppliers.length === 0}>
            <Plus className="h-4 w-4" /> Nuovo ordine
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            In attesa / transito
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.inAttesaCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Valore in attesa
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.valoreInAttesa)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Ricevuti questo mese
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.ricevutiMese}</p>
        </Card>
      </section>

      {suppliers.length === 0 && (
        <Card className="mb-4 border-warning/30 bg-warning/5">
          <CardContent className="pt-6 text-sm">
            Crea prima almeno un fornitore in{" "}
            <a href="/catalogo/fornitori" className="underline">
              /catalogo/fornitori
            </a>{" "}
            per poter registrare ordini di stock.
          </CardContent>
        </Card>
      )}

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="filter-stato" className="mb-0">
            Stato:
          </Label>
          <Select
            id="filter-stato"
            className="max-w-[200px]"
            value={filterStato}
            onChange={(e) => setFilterStato(e.target.value as PoStato | "")}
          >
            <option value="">Tutti</option>
            {VALID_STATI_PO.map((s) => (
              <option key={s} value={s}>
                {STATO_LABELS[s]}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} / {orders.length}
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Truck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {orders.length === 0
              ? "Nessun ordine registrato."
              : "Nessun ordine con il filtro corrente."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Fornitore</th>
                  <th className="px-4 py-3 text-left font-medium">Numero</th>
                  <th className="px-4 py-3 text-left font-medium">Consegna attesa</th>
                  <th className="px-4 py-3 text-right font-medium">Importo</th>
                  <th className="px-4 py-3 text-center font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openDetail(o.id)}
                  >
                    <td className="px-4 py-3 tabular-nums">
                      {formatDateShort(o.dataOrdine)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {o.supplierNome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.numeroOrdine ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.dataConsegnaAttesa
                        ? formatDateShort(o.dataConsegnaAttesa)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(o.importoTotale)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATO_VARIANTS[o.stato]}>
                        {STATO_LABELS[o.stato]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {creating && (
        <CreateOrderModal
          suppliers={suppliers}
          products={products}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {detailId && (
        <OrderDetailModal
          orderId={detailId}
          order={detailOrder}
          onClose={closeDetail}
          onReceived={() => {
            refreshDetail();
            router.refresh();
          }}
          onDeleted={() => {
            closeDetail();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ============================================
// CREATE ORDER MODAL
// ============================================

function CreateOrderModal({
  suppliers,
  products,
  onClose,
  onSaved,
}: {
  suppliers: SupplierOption[];
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_NEW_FORM);
  const [rows, setRows] = useState<NewRow[]>([{ ...EMPTY_ROW }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totale = rows.reduce((s, r) => {
    const q = parseInt(r.quantita, 10);
    const c = parseFloat(r.costoUnitario);
    if (!isNaN(q) && !isNaN(c)) return s + q * c;
    return s;
  }, 0);

  function updateRow(idx: number, patch: Partial<NewRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function onProductChange(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateRow(idx, {
      productId: productId as string | "",
      nomeProdotto: p?.nome ?? "",
      costoUnitario: p ? String(p.prezzo) : "0",
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(idx: number) {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.supplierId) return setError("Seleziona un fornitore");
    if (!form.dataOrdine) return setError("Data ordine obbligatoria");

    const parsedRows = [] as {
      productId: string | null;
      nomeProdotto: string;
      quantita: number;
      costoUnitario: number;
    }[];

    for (const [i, r] of rows.entries()) {
      const qty = parseInt(r.quantita, 10);
      const cost = parseFloat(r.costoUnitario);
      if (!r.nomeProdotto.trim())
        return setError(`Riga ${i + 1}: nome prodotto obbligatorio`);
      if (!Number.isInteger(qty) || qty <= 0)
        return setError(`Riga ${i + 1}: quantità intero > 0`);
      if (isNaN(cost) || cost < 0)
        return setError(`Riga ${i + 1}: costo >= 0`);
      parsedRows.push({
        productId: r.productId || null,
        nomeProdotto: r.nomeProdotto.trim(),
        quantita: qty,
        costoUnitario: cost,
      });
    }

    startTransition(async () => {
      try {
        await createPurchaseOrder({
          supplierId: form.supplierId,
          numeroOrdine: form.numeroOrdine.trim() || null,
          dataOrdine: form.dataOrdine,
          dataConsegnaAttesa: form.dataConsegnaAttesa || null,
          note: form.note.trim() || null,
          items: parsedRows,
        });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-3xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Nuovo ordine fornitore</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="ord-sup">Fornitore *</Label>
              <Select
                id="ord-sup"
                value={form.supplierId}
                onChange={(e) =>
                  setForm({ ...form, supplierId: e.target.value })
                }
                required
              >
                <option value="">Seleziona fornitore...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ord-num">Numero ordine</Label>
              <Input
                id="ord-num"
                value={form.numeroOrdine}
                onChange={(e) =>
                  setForm({ ...form, numeroOrdine: e.target.value })
                }
                placeholder="Opzionale"
              />
            </div>
            <div>
              <Label htmlFor="ord-data">Data ordine *</Label>
              <Input
                id="ord-data"
                type="date"
                value={form.dataOrdine}
                onChange={(e) =>
                  setForm({ ...form, dataOrdine: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="ord-consegna">Consegna attesa</Label>
              <Input
                id="ord-consegna"
                type="date"
                value={form.dataConsegnaAttesa}
                onChange={(e) =>
                  setForm({ ...form, dataConsegnaAttesa: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ord-note">Note</Label>
              <Textarea
                id="ord-note"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Righe prodotto *</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-4 w-4" /> Aggiungi riga
              </Button>
            </div>

            <div className="space-y-3">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div>
                    <Select
                      value={r.productId}
                      onChange={(e) => onProductChange(i, e.target.value)}
                      className="mb-2"
                    >
                      <option value="">Manuale (non in catalogo)</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Nome prodotto"
                      value={r.nomeProdotto}
                      onChange={(e) =>
                        updateRow(i, { nomeProdotto: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`row-qty-${i}`} className="text-xs">
                      Qtà
                    </Label>
                    <Input
                      id={`row-qty-${i}`}
                      type="number"
                      min="1"
                      step="1"
                      value={r.quantita}
                      onChange={(e) => updateRow(i, { quantita: e.target.value })}
                      className="w-24"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`row-cost-${i}`} className="text-xs">
                      Costo €
                    </Label>
                    <Input
                      id={`row-cost-${i}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.costoUnitario}
                      onChange={(e) =>
                        updateRow(i, { costoUnitario: e.target.value })
                      }
                      className="w-28"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    aria-label="Rimuovi riga"
                    className="self-end"
                  >
                    <X className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="mt-3 text-right text-sm text-muted-foreground">
              Totale stimato:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(totale)}
              </span>
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvataggio..." : "Crea ordine"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================================
// DETAIL MODAL (drawer-like, centered)
// ============================================

function OrderDetailModal({
  orderId,
  order,
  onClose,
  onReceived,
  onDeleted,
}: {
  orderId: string;
  order: PurchaseOrderWithItems | null;
  onClose: () => void;
  onReceived: () => void;
  onDeleted: () => void;
}) {
  const [showReceive, setShowReceive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Eliminare l'ordine? Solo se non ancora ricevuto.")) return;
    setDeleting(true);
    const res = await deletePurchaseOrder(orderId);
    setDeleting(false);
    if (!res.ok) {
      alert(res.error ?? "Errore eliminazione");
      return;
    }
    onDeleted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-3xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {order?.supplierNome ?? "Dettaglio ordine"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {order?.numeroOrdine
                  ? `Ordine ${order.numeroOrdine}`
                  : "Senza numero"}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {order && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant={STATO_VARIANTS[order.stato]}>
                {STATO_LABELS[order.stato]}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Ordine:{" "}
                {formatDateShort(order.dataOrdine)}
              </span>
              {order.dataConsegnaAttesa && (
                <span>Attesa: {formatDateShort(order.dataConsegnaAttesa)}</span>
              )}
              {order.dataConsegnaEffettiva && (
                <span>
                  Ricevuto: {formatDateShort(order.dataConsegnaEffettiva)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6">
          {!order ? (
            <p className="text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : (
            <>
              <h3 className="mb-2 text-sm font-semibold">Righe prodotto</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Prodotto
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Qtà</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Ricevuto
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Costo u.
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Subtotale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {order.items.map((it) => {
                      const complete = it.quantitaRicevuta >= it.quantita;
                      return (
                        <tr key={it.id}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{it.nomeProdotto}</span>
                              {it.productId && (
                                <Badge variant="outline">cat.</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {it.quantita}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums ${
                              complete ? "text-success" : "text-warning"
                            }`}
                          >
                            {it.quantitaRicevuta}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCurrency(it.costoUnitario)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {formatCurrency(it.quantita * it.costoUnitario)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-sm">
                        Totale ordine
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCurrency(order.importoTotale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {order.note && (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Note
                  </p>
                  <p className="mt-1 text-muted-foreground">{order.note}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting || order.stato === "ricevuto"}
                >
                  Elimina
                </Button>
                {order.stato !== "ricevuto" && order.stato !== "cancellato" && (
                  <Button onClick={() => setShowReceive(true)}>
                    <CheckCircle2 className="h-4 w-4" /> Ricevi merce
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {showReceive && order && (
          <ReceiveModal
            order={order}
            onClose={() => setShowReceive(false)}
            onDone={() => {
              setShowReceive(false);
              onReceived();
            }}
          />
        )}
      </Card>
    </div>
  );
}

// ============================================
// RECEIVE MODAL
// ============================================

function ReceiveModal({
  order,
  onClose,
  onDone,
}: {
  order: PurchaseOrderWithItems;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const it of order.items) {
      const residuo = it.quantita - it.quantitaRicevuta;
      init[it.id] = String(Math.max(0, residuo));
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: { itemId: string; qty: number }[] = [];
    for (const it of order.items) {
      const raw = quantities[it.id] ?? "0";
      const qty = parseInt(raw, 10);
      if (!Number.isInteger(qty) || qty < 0) {
        return setError(`${it.nomeProdotto}: quantità non valida`);
      }
      const residuo = it.quantita - it.quantitaRicevuta;
      if (qty > residuo) {
        return setError(
          `${it.nomeProdotto}: qty (${qty}) > residuo (${residuo})`
        );
      }
      if (qty > 0) payload.push({ itemId: it.id, qty });
    }

    if (payload.length === 0) {
      return setError("Inserisci almeno una quantità > 0");
    }

    startTransition(async () => {
      try {
        const res = await receivePurchaseOrder(order.id, payload);
        if (!res.ok && res.errors.length > 0) {
          setError(res.errors.join(" | "));
          return;
        }
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore ricezione");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6">
          <h3 className="mb-2 text-lg font-semibold">Ricevi merce</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Conferma le quantità ricevute. I prodotti linkati al catalogo
            verranno incrementati in giacenza.
          </p>

          <div className="space-y-3">
            {order.items.map((it) => {
              const residuo = it.quantita - it.quantitaRicevuta;
              const disabled = residuo <= 0;
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{it.nomeProdotto}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordinato {it.quantita} · già ric. {it.quantitaRicevuta} ·
                      residuo {residuo}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={residuo}
                    step="1"
                    value={quantities[it.id]}
                    onChange={(e) =>
                      setQuantities({ ...quantities, [it.id]: e.target.value })
                    }
                    disabled={disabled}
                    className="w-24"
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Aggiornamento..." : "Conferma ricezione"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
