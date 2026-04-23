"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate } from "@/lib/security/validate";

// ============================================
// TYPES
// ============================================

export type StockStatus = "ok" | "basso" | "esaurito";

export type InventoryRow = {
  id: string;
  nome: string;
  categoria: string | null;
  prezzo: number;
  giacenza: number;
  sogliaAlert: number;
  attivo: boolean;
  valoreStock: number;
  stato: StockStatus;
  imageUrl: string | null;
};

export type InventoryMovement = {
  id: string;
  productId: string | null;
  productNome: string;
  data: string; // ISO date
  qty: number; // positivo = entrata, negativo = uscita
  tipo: "entrata" | "uscita";
  riferimento: string; // descrizione (es. "Ordine XXX" o "Vendita #abc")
  refId: string | null;
};

// ============================================
// OVERVIEW (lista prodotti con stato scorta)
// ============================================

export async function getInventoryOverview(opts?: {
  onlyLowStock?: boolean;
  categoria?: string;
}): Promise<InventoryRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("id, nome, categoria, prezzo, giacenza, soglia_alert, attivo, image_url")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (opts?.categoria) {
    query = query.eq("categoria", opts.categoria);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((p): InventoryRow => {
    const giacenza = p.giacenza ?? 0;
    const soglia = p.soglia_alert ?? 5;
    const prezzo =
      typeof p.prezzo === "string" ? Number(p.prezzo) : (p.prezzo as number);
    const stato: StockStatus =
      giacenza <= 0 ? "esaurito" : giacenza <= soglia ? "basso" : "ok";
    return {
      id: p.id as string,
      nome: p.nome as string,
      categoria: (p.categoria as string | null) ?? null,
      prezzo,
      giacenza,
      sogliaAlert: soglia,
      attivo: Boolean(p.attivo),
      valoreStock: prezzo * giacenza,
      stato,
      imageUrl: (p.image_url as string | null) ?? null,
    };
  });

  if (opts?.onlyLowStock) {
    return rows.filter((r) => r.stato !== "ok");
  }
  return rows;
}

export type InventoryStats = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
};

export async function getInventoryStats(): Promise<InventoryStats> {
  const rows = await getInventoryOverview();
  return {
    totalProducts: rows.length,
    lowStockCount: rows.filter((r) => r.stato === "basso").length,
    outOfStockCount: rows.filter((r) => r.stato === "esaurito").length,
    totalValue: rows.reduce((s, r) => s + r.valoreStock, 0),
  };
}

// ============================================
// MOVEMENTS (entrate + uscite cronologiche)
// ============================================

type PoiMovementRow = {
  id: string;
  product_id: string | null;
  nome_prodotto: string;
  quantita_ricevuta: number;
  purchase_order_id: string;
  purchase_orders: {
    data_consegna_effettiva: string | null;
    data_ordine: string;
    numero_ordine: string | null;
    stato: string;
  } | null;
};

type TxItemMovementRow = {
  id: string;
  ref_id: string | null;
  label: string;
  quantity: number;
  transaction_id: string;
  transactions: {
    data: string;
  } | null;
};

export async function getInventoryMovements(
  productId?: string,
  from?: string,
  to?: string
): Promise<InventoryMovement[]> {
  const supabase = createAdminClient();
  const fromDate = from && isValidDate(from) ? from : null;
  const toDate = to && isValidDate(to) ? to : null;
  const safeProductId = productId && isValidUUID(productId) ? productId : null;

  // ENTRATE: righe purchase_order_items con quantita_ricevuta > 0, su PO
  // già ricevuti o in_transito. Usiamo data_consegna_effettiva se presente
  // altrimenti data_ordine.
  let entrateQ = supabase
    .from("purchase_order_items")
    .select(
      "id, product_id, nome_prodotto, quantita_ricevuta, purchase_order_id, purchase_orders!inner(data_consegna_effettiva, data_ordine, numero_ordine, stato)"
    )
    .gt("quantita_ricevuta", 0)
    .in("purchase_orders.stato", ["ricevuto", "in_transito"]);

  if (safeProductId) entrateQ = entrateQ.eq("product_id", safeProductId);

  const { data: entrateData, error: entrateErr } = await entrateQ;
  if (entrateErr) throw entrateErr;

  const entrate: InventoryMovement[] = ((entrateData as PoiMovementRow[] | null) || []).map(
    (r) => {
      const data =
        r.purchase_orders?.data_consegna_effettiva ??
        r.purchase_orders?.data_ordine ??
        "";
      const ref =
        r.purchase_orders?.numero_ordine ??
        `Ordine ${r.purchase_order_id.slice(0, 8)}`;
      return {
        id: `po-${r.id}`,
        productId: r.product_id,
        productNome: r.nome_prodotto,
        data,
        qty: r.quantita_ricevuta,
        tipo: "entrata",
        riferimento: `Ordine ${ref}`,
        refId: r.purchase_order_id,
      };
    }
  );

  // USCITE: transaction_items con kind='prodotto'. La data viene dalla
  // transaction collegata. Filtriamo per refId == product se specificato.
  let usciteQ = supabase
    .from("transaction_items")
    .select("id, ref_id, label, quantity, transaction_id, transactions!inner(data)")
    .eq("kind", "prodotto");

  if (safeProductId) usciteQ = usciteQ.eq("ref_id", safeProductId);

  const { data: usciteData, error: usciteErr } = await usciteQ;
  if (usciteErr) throw usciteErr;

  const uscite: InventoryMovement[] = ((usciteData as TxItemMovementRow[] | null) || []).map(
    (r) => ({
      id: `tx-${r.id}`,
      productId: r.ref_id,
      productNome: r.label,
      data: r.transactions?.data ?? "",
      qty: -Math.abs(r.quantity),
      tipo: "uscita",
      riferimento: `Vendita #${r.transaction_id.slice(0, 8)}`,
      refId: r.transaction_id,
    })
  );

  let all = [...entrate, ...uscite];

  if (fromDate) all = all.filter((m) => m.data >= fromDate);
  if (toDate) all = all.filter((m) => m.data <= toDate);

  // Ordine desc per data (recenti prima)
  all.sort((a, b) => {
    if (a.data < b.data) return 1;
    if (a.data > b.data) return -1;
    return 0;
  });

  return all;
}
