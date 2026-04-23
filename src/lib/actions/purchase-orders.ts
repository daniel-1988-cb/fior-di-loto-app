"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";
import { VALID_STATI_PO, type PoStato } from "@/lib/constants/purchase-orders";

// ============================================
// TYPES
// ============================================

// Re-export types for convenience (types are allowed in "use server" files)
export type { PoStato };

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string | null;
  nomeProdotto: string;
  quantita: number;
  costoUnitario: number;
  quantitaRicevuta: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierNome?: string;
  numeroOrdine: string | null;
  dataOrdine: string;
  dataConsegnaAttesa: string | null;
  dataConsegnaEffettiva: string | null;
  stato: PoStato;
  importoTotale: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderWithItems = PurchaseOrder & {
  items: PurchaseOrderItem[];
};

type PoRow = {
  id: string;
  supplier_id: string;
  numero_ordine: string | null;
  data_ordine: string;
  data_consegna_attesa: string | null;
  data_consegna_effettiva: string | null;
  stato: string;
  importo_totale: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: { nome: string } | null;
};

type PoItemRow = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  nome_prodotto: string;
  quantita: number;
  costo_unitario: number | string;
  quantita_ricevuta: number;
};

function rowToPo(row: PoRow): PurchaseOrder {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierNome: row.suppliers?.nome,
    numeroOrdine: row.numero_ordine,
    dataOrdine: row.data_ordine,
    dataConsegnaAttesa: row.data_consegna_attesa,
    dataConsegnaEffettiva: row.data_consegna_effettiva,
    stato: (VALID_STATI_PO as readonly string[]).includes(row.stato)
      ? (row.stato as PoStato)
      : "in_attesa",
    importoTotale:
      typeof row.importo_totale === "string"
        ? Number(row.importo_totale)
        : row.importo_totale,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToItem(row: PoItemRow): PurchaseOrderItem {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    productId: row.product_id,
    nomeProdotto: row.nome_prodotto,
    quantita: row.quantita,
    costoUnitario:
      typeof row.costo_unitario === "string"
        ? Number(row.costo_unitario)
        : row.costo_unitario,
    quantitaRicevuta: row.quantita_ricevuta,
  };
}

// ============================================
// READ OPERATIONS
// ============================================

export type GetPurchaseOrdersOpts = {
  stato?: PoStato;
  supplierId?: string;
  dataFrom?: string;
  dataTo?: string;
};

export async function getPurchaseOrders(
  opts: GetPurchaseOrdersOpts = {}
): Promise<PurchaseOrder[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("purchase_orders")
    .select("*, suppliers(nome)")
    .order("data_ordine", { ascending: false });

  if (opts.stato && (VALID_STATI_PO as readonly string[]).includes(opts.stato)) {
    query = query.eq("stato", opts.stato);
  }
  if (opts.supplierId && isValidUUID(opts.supplierId)) {
    query = query.eq("supplier_id", opts.supplierId);
  }
  if (opts.dataFrom && isValidDate(opts.dataFrom)) {
    query = query.gte("data_ordine", opts.dataFrom);
  }
  if (opts.dataTo && isValidDate(opts.dataTo)) {
    query = query.lte("data_ordine", opts.dataTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => rowToPo(r as PoRow));
}

export async function getPurchaseOrder(
  id: string
): Promise<PurchaseOrderWithItems | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();

  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, suppliers(nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (poRes.error) throw poRes.error;
  if (!poRes.data) return null;
  if (itemsRes.error) throw itemsRes.error;

  return {
    ...rowToPo(poRes.data as PoRow),
    items: (itemsRes.data || []).map((r) => rowToItem(r as PoItemRow)),
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

type PoItemInput = {
  productId?: string | null;
  nomeProdotto: string;
  quantita: number;
  costoUnitario: number;
};

type CreatePoInput = {
  supplierId: string;
  numeroOrdine?: string | null;
  dataOrdine: string;
  dataConsegnaAttesa?: string | null;
  note?: string | null;
  stato?: PoStato;
  items: PoItemInput[];
};

function validateItems(items: PoItemInput[]): PoItemInput[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Almeno una riga prodotto richiesta");
  }
  if (items.length > 200) throw new Error("Massimo 200 righe per ordine");

  return items.map((it, idx) => {
    if (!it.nomeProdotto || it.nomeProdotto.trim().length === 0) {
      throw new Error(`Riga ${idx + 1}: nome prodotto obbligatorio`);
    }
    if (!Number.isInteger(it.quantita) || it.quantita <= 0) {
      throw new Error(`Riga ${idx + 1}: quantità deve essere intero > 0`);
    }
    if (typeof it.costoUnitario !== "number" || it.costoUnitario < 0) {
      throw new Error(`Riga ${idx + 1}: costo unitario non valido`);
    }
    if (it.productId && !isValidUUID(it.productId)) {
      throw new Error(`Riga ${idx + 1}: productId non valido`);
    }
    return {
      productId: it.productId || null,
      nomeProdotto: truncate(sanitizeString(it.nomeProdotto), 500),
      quantita: it.quantita,
      costoUnitario: it.costoUnitario,
    };
  });
}

function computeTotale(items: PoItemInput[]): number {
  return items.reduce((s, it) => s + it.quantita * it.costoUnitario, 0);
}

export async function createPurchaseOrder(
  input: CreatePoInput
): Promise<PurchaseOrderWithItems> {
  if (!isValidUUID(input.supplierId)) throw new Error("Fornitore non valido");
  if (!isValidDate(input.dataOrdine)) throw new Error("Data ordine non valida");
  if (input.dataConsegnaAttesa && !isValidDate(input.dataConsegnaAttesa)) {
    throw new Error("Data consegna attesa non valida");
  }
  const stato: PoStato =
    input.stato && (VALID_STATI_PO as readonly string[]).includes(input.stato)
      ? input.stato
      : "in_attesa";
  const items = validateItems(input.items);
  const importo = computeTotale(items);

  const supabase = createAdminClient();

  const { data: poRow, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      supplier_id: input.supplierId,
      numero_ordine: input.numeroOrdine
        ? truncate(sanitizeString(input.numeroOrdine), 50)
        : null,
      data_ordine: input.dataOrdine,
      data_consegna_attesa: input.dataConsegnaAttesa ?? null,
      stato,
      importo_totale: importo,
      note: input.note ? truncate(sanitizeString(input.note), 2000) : null,
    })
    .select()
    .single();
  if (poErr) throw poErr;

  const itemsPayload = items.map((it) => ({
    purchase_order_id: poRow.id,
    product_id: it.productId,
    nome_prodotto: it.nomeProdotto,
    quantita: it.quantita,
    costo_unitario: it.costoUnitario,
    quantita_ricevuta: 0,
  }));

  const { data: itemRows, error: itemsErr } = await supabase
    .from("purchase_order_items")
    .insert(itemsPayload)
    .select();
  if (itemsErr) {
    // best-effort cleanup
    await supabase.from("purchase_orders").delete().eq("id", poRow.id);
    throw itemsErr;
  }

  return {
    ...rowToPo(poRow as PoRow),
    items: (itemRows || []).map((r) => rowToItem(r as PoItemRow)),
  };
}

type UpdatePoInput = {
  numeroOrdine?: string | null;
  dataOrdine?: string;
  dataConsegnaAttesa?: string | null;
  note?: string | null;
  stato?: PoStato;
};

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePoInput
): Promise<PurchaseOrder> {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const updates: Record<string, unknown> = {};
  if (input.numeroOrdine !== undefined) {
    updates.numero_ordine = input.numeroOrdine
      ? truncate(sanitizeString(input.numeroOrdine), 50)
      : null;
  }
  if (input.dataOrdine !== undefined) {
    if (!isValidDate(input.dataOrdine)) throw new Error("Data ordine non valida");
    updates.data_ordine = input.dataOrdine;
  }
  if (input.dataConsegnaAttesa !== undefined) {
    if (input.dataConsegnaAttesa && !isValidDate(input.dataConsegnaAttesa)) {
      throw new Error("Data consegna attesa non valida");
    }
    updates.data_consegna_attesa = input.dataConsegnaAttesa ?? null;
  }
  if (input.note !== undefined) {
    updates.note = input.note ? truncate(sanitizeString(input.note), 2000) : null;
  }
  if (input.stato !== undefined) {
    if (!(VALID_STATI_PO as readonly string[]).includes(input.stato)) {
      throw new Error("Stato non valido");
    }
    updates.stato = input.stato;
  }
  updates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id)
    .select("*, suppliers(nome)")
    .single();
  if (error) throw error;
  return rowToPo(data as PoRow);
}

export async function deletePurchaseOrder(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  // Se già ricevuto blocchiamo (comprometterebbe lo storico giacenza).
  const { data: existing } = await supabase
    .from("purchase_orders")
    .select("stato")
    .eq("id", id)
    .maybeSingle();
  if (existing && existing.stato === "ricevuto") {
    return {
      ok: false,
      error: "Ordine già ricevuto: impossibile eliminare (usa stato cancellato solo per futuri).",
    };
  }
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// RECEIVE (aggiorna giacenza)
// ============================================

export type ReceiveItemInput = { itemId: string; qty: number };

/**
 * Riceve merce per un ordine: aggiorna quantita_ricevuta su ciascuna riga e
 * incrementa products.giacenza per ogni riga con product_id != null.
 * Se tutte le righe sono complete, imposta stato='ricevuto' e
 * data_consegna_effettiva=oggi.
 *
 * Transazione application-level (best-effort): non atomica rispetto a
 * fallimenti parziali. Logga gli errori per-item ma continua sugli altri.
 */
export async function receivePurchaseOrder(
  id: string,
  itemsReceived: ReceiveItemInput[]
): Promise<{ ok: boolean; stato: PoStato; errors: string[] }> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!Array.isArray(itemsReceived)) throw new Error("Items ricevuti non valido");

  const supabase = createAdminClient();
  const errors: string[] = [];

  // Carica righe dell'ordine per validare itemId e scoprire product_id.
  const { data: rows, error: loadErr } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id);
  if (loadErr) throw loadErr;
  if (!rows || rows.length === 0) {
    return { ok: false, stato: "in_attesa", errors: ["Ordine senza righe"] };
  }

  const byId = new Map<string, PoItemRow>(
    rows.map((r) => [r.id as string, r as PoItemRow])
  );

  // Aggiorna ogni riga + incrementa giacenza.
  for (const inp of itemsReceived) {
    if (!isValidUUID(inp.itemId)) {
      errors.push(`itemId non valido: ${inp.itemId}`);
      continue;
    }
    if (!Number.isInteger(inp.qty) || inp.qty < 0) {
      errors.push(`quantità non valida per ${inp.itemId}`);
      continue;
    }
    const row = byId.get(inp.itemId);
    if (!row) {
      errors.push(`riga non trovata: ${inp.itemId}`);
      continue;
    }
    const nuovaQtaRic = row.quantita_ricevuta + inp.qty;
    if (nuovaQtaRic > row.quantita) {
      errors.push(
        `${row.nome_prodotto}: qty ricevuta (${nuovaQtaRic}) > ordinata (${row.quantita})`
      );
      continue;
    }

    // Update quantita_ricevuta
    const { error: upErr } = await supabase
      .from("purchase_order_items")
      .update({ quantita_ricevuta: nuovaQtaRic })
      .eq("id", inp.itemId);
    if (upErr) {
      errors.push(`${row.nome_prodotto}: ${upErr.message}`);
      continue;
    }

    // Incrementa giacenza prodotto (se linkato)
    if (row.product_id && inp.qty > 0) {
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select("giacenza")
        .eq("id", row.product_id)
        .maybeSingle();
      if (prodErr) {
        errors.push(`read giacenza ${row.nome_prodotto}: ${prodErr.message}`);
        continue;
      }
      if (!prod) {
        errors.push(`prodotto ${row.product_id} non trovato`);
        continue;
      }
      const newGiac = (prod.giacenza ?? 0) + inp.qty;
      const { error: giacErr } = await supabase
        .from("products")
        .update({ giacenza: newGiac })
        .eq("id", row.product_id);
      if (giacErr) {
        errors.push(`update giacenza ${row.nome_prodotto}: ${giacErr.message}`);
      }
    }

    // Riallinea mappa per ricalcolo stato
    row.quantita_ricevuta = nuovaQtaRic;
  }

  // Se tutte le righe sono complete -> stato 'ricevuto' + data oggi
  const allComplete = Array.from(byId.values()).every(
    (r) => r.quantita_ricevuta >= r.quantita
  );
  const nowIso = new Date().toISOString().slice(0, 10);
  const poUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (allComplete) {
    poUpdates.stato = "ricevuto";
    poUpdates.data_consegna_effettiva = nowIso;
  } else {
    // Passa a 'in_transito' se era 'in_attesa' e abbiamo ricevuto qualcosa
    const anyReceived = Array.from(byId.values()).some(
      (r) => r.quantita_ricevuta > 0
    );
    if (anyReceived) poUpdates.stato = "in_transito";
  }

  const { error: poErr } = await supabase
    .from("purchase_orders")
    .update(poUpdates)
    .eq("id", id);
  if (poErr) errors.push(`update PO: ${poErr.message}`);

  return {
    ok: errors.length === 0,
    stato: allComplete
      ? "ricevuto"
      : (poUpdates.stato as PoStato) ?? "in_attesa",
    errors,
  };
}
