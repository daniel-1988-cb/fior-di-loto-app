"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================
// Helpers
// ============================================

function monthRange(date = new Date()) {
  const year = date.getFullYear();
  const mon = date.getMonth();
  const start = new Date(year, mon, 1);
  const nextStart = new Date(year, mon + 1, 1);
  return {
    start: toIsoDate(start),
    nextStart: toIsoDate(nextStart),
  };
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isValidIsoDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidIsoMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

/** Returns [start, nextStart] inclusive/exclusive ISO date strings for a YYYY-MM month. */
function monthRangeFromString(month: string): { start: string; nextStart: string } {
  const [y, m] = month.split("-").map((p) => parseInt(p, 10));
  const start = new Date(y, m - 1, 1);
  const nextStart = new Date(y, m, 1);
  return {
    start: toIsoDate(start),
    nextStart: toIsoDate(nextStart),
  };
}

// ============================================
// Types
// ============================================

export type VenditeSummary = {
  entrate_mese: number;
  entrate_mese_precedente: number;
  entrate_oggi: number;
  transazioni_count_mese: number;
  voucher_attivi: number;
  appuntamenti_pagati_mese: number;
};

export type TransazioneListItem = {
  id: string;
  data: string;
  descrizione: string;
  categoria: string | null;
  metodoPagamento: string | null;
  importo: number;
  tipo: "entrata" | "uscita";
  clienteNome: string | null;
};

export type VoucherListItem = {
  id: string;
  codice: string;
  tipo: string;
  valore: number;
  dataEmissione: string;
  dataScadenza: string | null;
  usato: boolean;
  usatoIl: string | null;
  clienteNome: string | null;
};

export type AppuntamentoPagato = {
  id: string;
  data: string;
  oraInizio: string;
  pagatoAt: string;
  clienteNome: string;
  servizioNome: string;
  staffNome: string | null;
  importo: number;
};

export type ProductSaleRow = {
  id: string;
  data: string;
  clientId: string | null;
  clientName: string | null;
  productLabel: string;
  quantity: number;
  unitPrice: number;
  totalRow: number;
  metodoPagamento: string | null;
};

export type SubscriptionSaleRow = {
  id: string;
  data: string;
  clientId: string | null;
  clientName: string | null;
  subscriptionName: string;
  seduteTotali: number | null;
  prezzo: number;
  metodoPagamento: string | null;
};

// ============================================
// getVenditeSummary
// ============================================

export async function getVenditeSummary(): Promise<VenditeSummary> {
  const supabase = await createClient();
  const now = new Date();
  const { start, nextStart } = monthRange(now);

  // Previous month range
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { start: prevStart, nextStart: prevNextStart } = monthRange(prevMonthDate);

  const today = toIsoDate(now);
  const nowIso = now.toISOString();

  const [
    { data: entrateMeseRows },
    { data: entratePrevRows },
    { data: entrateOggiRows },
    { count: txCount },
    { count: voucherCount },
    { count: aptPagatiCount },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("importo")
      .eq("tipo", "entrata")
      .gte("data", start)
      .lt("data", nextStart),
    supabase
      .from("transactions")
      .select("importo")
      .eq("tipo", "entrata")
      .gte("data", prevStart)
      .lt("data", prevNextStart),
    supabase
      .from("transactions")
      .select("importo")
      .eq("tipo", "entrata")
      .eq("data", today),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .gte("data", start)
      .lt("data", nextStart),
    supabase
      .from("vouchers")
      .select("id", { count: "exact", head: true })
      .eq("usato", false)
      .or(`data_scadenza.is.null,data_scadenza.gte.${today}`),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .not("pagato_at", "is", null)
      .gte("pagato_at", `${start}T00:00:00Z`)
      .lt("pagato_at", `${nextStart}T00:00:00Z`)
      // ensure within "current month" by pagato_at timestamp
      .lte("pagato_at", nowIso),
  ]);

  const sum = (rows: { importo: number | string | null }[] | null) =>
    (rows || []).reduce((s, r) => s + Number(r.importo || 0), 0);

  return {
    entrate_mese: sum(entrateMeseRows),
    entrate_mese_precedente: sum(entratePrevRows),
    entrate_oggi: sum(entrateOggiRows),
    transazioni_count_mese: txCount ?? 0,
    voucher_attivi: voucherCount ?? 0,
    appuntamenti_pagati_mese: aptPagatiCount ?? 0,
  };
}

// ============================================
// getTransazioniList
// ============================================

export async function getTransazioniList(opts: {
  dataFrom?: string;
  dataTo?: string;
  metodo?: string;
  tipo?: "entrata" | "uscita";
  limit?: number;
  offset?: number;
}): Promise<{ rows: TransazioneListItem[]; total: number }> {
  const supabase = await createClient();

  // Default: current month
  const now = new Date();
  const { start, nextStart } = monthRange(now);
  const dataFrom = isValidIsoDate(opts.dataFrom) ? opts.dataFrom : start;
  // dataTo is inclusive; convert to exclusive upper bound via lt next day
  const dataToInclusive = isValidIsoDate(opts.dataTo) ? opts.dataTo : nextStart;
  // If opts.dataTo was valid, compute exclusive upper = dataTo + 1 day
  let upperExclusive = dataToInclusive;
  if (isValidIsoDate(opts.dataTo)) {
    const d = new Date(`${opts.dataTo}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    upperExclusive = toIsoDate(d);
  }

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const selectCols = "id, data, descrizione, categoria, metodo_pagamento, importo, tipo, clients(nome, cognome)";

  let query = supabase
    .from("transactions")
    .select(selectCols, { count: "exact" })
    .gte("data", dataFrom)
    .lt("data", upperExclusive)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.metodo) query = query.eq("metodo_pagamento", opts.metodo);
  if (opts.tipo) query = query.eq("tipo", opts.tipo);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: TransazioneListItem[] = (data || []).map((r) => {
    const client = r.clients as { nome?: string; cognome?: string } | null;
    return {
      id: r.id as string,
      data: r.data as string,
      descrizione: (r.descrizione as string) || "",
      categoria: (r.categoria as string | null) ?? null,
      metodoPagamento: (r.metodo_pagamento as string | null) ?? null,
      importo: Number(r.importo || 0),
      tipo: r.tipo as "entrata" | "uscita",
      clienteNome: client ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim() || null : null,
    };
  });

  return { rows, total: count ?? rows.length };
}

// ============================================
// getVoucherList
// ============================================

export async function getVoucherList(opts: {
  stato?: "attivo" | "usato" | "scaduto" | "all";
} = {}): Promise<VoucherListItem[]> {
  const supabase = await createClient();
  const stato = opts.stato ?? "attivo";
  const today = toIsoDate(new Date());

  let query = supabase
    .from("vouchers")
    .select(
      "id, codice, tipo, valore, created_at, data_scadenza, usato, data_uso, destinatario:destinatario_id(nome, cognome), acquistato_da:acquistato_da_id(nome, cognome)"
    )
    .order("created_at", { ascending: false });

  if (stato === "attivo") {
    query = query
      .eq("usato", false)
      .or(`data_scadenza.is.null,data_scadenza.gte.${today}`);
  } else if (stato === "usato") {
    query = query.eq("usato", true);
  } else if (stato === "scaduto") {
    query = query.eq("usato", false).lt("data_scadenza", today);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((v) => {
    const dest = v.destinatario as { nome?: string; cognome?: string } | null;
    const acq = v.acquistato_da as { nome?: string; cognome?: string } | null;
    const cliente = dest ?? acq;
    return {
      id: v.id as string,
      codice: v.codice as string,
      tipo: v.tipo as string,
      valore: Number(v.valore || 0),
      dataEmissione: v.created_at as string,
      dataScadenza: (v.data_scadenza as string | null) ?? null,
      usato: !!v.usato,
      usatoIl: (v.data_uso as string | null) ?? null,
      clienteNome: cliente
        ? `${cliente.nome ?? ""} ${cliente.cognome ?? ""}`.trim() || null
        : null,
    };
  });
}

// ============================================
// getAppuntamentiPagati
// ============================================

export async function getAppuntamentiPagati(opts: {
  dataFrom?: string;
  dataTo?: string;
} = {}): Promise<AppuntamentoPagato[]> {
  const supabase = await createClient();

  const now = new Date();
  const { start, nextStart } = monthRange(now);
  const dataFrom = isValidIsoDate(opts.dataFrom) ? opts.dataFrom : start;
  let upperExclusive = nextStart;
  if (isValidIsoDate(opts.dataTo)) {
    const d = new Date(`${opts.dataTo}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    upperExclusive = toIsoDate(d);
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, data, ora_inizio, pagato_at, clients(nome, cognome), services(nome, prezzo), staff(nome, cognome)"
    )
    .not("pagato_at", "is", null)
    .gte("data", dataFrom)
    .lt("data", upperExclusive)
    .order("data", { ascending: false })
    .order("ora_inizio", { ascending: false })
    .limit(500);

  if (error) throw error;

  const rows = data || [];

  // Fetch associated transactions for these appointments if possible.
  // transactions may reference appointment_id (optional column) — fall back to service price.
  const aptIds = rows.map((r) => r.id as string);
  const txByAppt: Map<string, number> = new Map();
  if (aptIds.length > 0) {
    // Try by client + day match — transactions schema does not include appointment_id in migrations we saw.
    // Use service.prezzo fallback.
  }

  return rows.map((a) => {
    const client = a.clients as { nome?: string; cognome?: string } | null;
    const service = a.services as { nome?: string; prezzo?: number | string | null } | null;
    const staff = a.staff as { nome?: string; cognome?: string } | null;
    const id = a.id as string;
    const importo = txByAppt.get(id) ?? Number(service?.prezzo ?? 0);
    return {
      id,
      data: a.data as string,
      oraInizio: String(a.ora_inizio || "").slice(0, 5),
      pagatoAt: a.pagato_at as string,
      clienteNome: client ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim() : "—",
      servizioNome: service?.nome ?? "—",
      staffNome: staff ? `${staff.nome ?? ""} ${staff.cognome ?? ""}`.trim() || null : null,
      importo,
    };
  });
}

// ============================================
// getProductSales — vendite di prodotti per mese
// ============================================

type TxItemJoinedRow = {
  id: string;
  label: string;
  quantity: number | string;
  unit_price: number | string;
  transaction_id: string;
  ref_id: string | null;
  transactions:
    | {
        data: string;
        metodo_pagamento: string | null;
        client_id: string | null;
        clients: { nome?: string; cognome?: string } | { nome?: string; cognome?: string }[] | null;
      }
    | {
        data: string;
        metodo_pagamento: string | null;
        client_id: string | null;
        clients: { nome?: string; cognome?: string } | { nome?: string; cognome?: string }[] | null;
      }[]
    | null;
};

function pickOneTx(
  v: TxItemJoinedRow["transactions"]
): { data: string; metodo_pagamento: string | null; client_id: string | null; clients: { nome?: string; cognome?: string } | { nome?: string; cognome?: string }[] | null } | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function pickOneClient(
  v: { nome?: string; cognome?: string } | { nome?: string; cognome?: string }[] | null | undefined
): { nome?: string; cognome?: string } | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/**
 * Vendite prodotti del mese specificato (YYYY-MM). Default: mese corrente.
 * Joina transaction_items kind='prodotto' con la transactions parent
 * (filtro `data` su mese). Limit 200 righe.
 */
export async function getProductSales(month?: string): Promise<ProductSaleRow[]> {
  const supabase = await createClient();

  const target = isValidIsoMonth(month)
    ? month
    : (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();
  const { start, nextStart } = monthRangeFromString(target);

  const { data, error } = await supabase
    .from("transaction_items")
    .select(
      "id, label, quantity, unit_price, transaction_id, ref_id, transactions!inner(data, metodo_pagamento, client_id, clients(nome, cognome))"
    )
    .eq("kind", "prodotto")
    .gte("transactions.data", start)
    .lt("transactions.data", nextStart)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data || []) as unknown as TxItemJoinedRow[];

  return rows
    .map((r) => {
      const tx = pickOneTx(r.transactions);
      if (!tx) return null;
      const client = pickOneClient(tx.clients);
      const qty = Number(r.quantity) || 0;
      const unit = Number(r.unit_price) || 0;
      return {
        id: r.id,
        data: tx.data,
        clientId: tx.client_id,
        clientName: client
          ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim() || null
          : null,
        productLabel: r.label,
        quantity: qty,
        unitPrice: unit,
        totalRow: Math.round(qty * unit * 100) / 100,
        metodoPagamento: tx.metodo_pagamento,
      } satisfies ProductSaleRow;
    })
    .filter((r): r is ProductSaleRow => r !== null)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

// ============================================
// getSubscriptionSales — abbonamenti venduti per mese
// ============================================

/**
 * Vendite abbonamenti del mese (YYYY-MM). Default: mese corrente.
 * Per ogni transaction_item kind='abbonamento' fa lookup del subscription
 * via ref_id per recuperare nome canonico e sedute_totali. Limit 200.
 */
export async function getSubscriptionSales(month?: string): Promise<SubscriptionSaleRow[]> {
  const supabase = await createClient();

  const target = isValidIsoMonth(month)
    ? month
    : (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();
  const { start, nextStart } = monthRangeFromString(target);

  const { data, error } = await supabase
    .from("transaction_items")
    .select(
      "id, label, quantity, unit_price, transaction_id, ref_id, transactions!inner(data, metodo_pagamento, client_id, clients(nome, cognome))"
    )
    .eq("kind", "abbonamento")
    .gte("transactions.data", start)
    .lt("transactions.data", nextStart)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data || []) as unknown as TxItemJoinedRow[];

  // Lookup subscriptions for sedute_totali / nome canonico.
  const refIds = Array.from(
    new Set(rows.map((r) => r.ref_id).filter((id): id is string => !!id))
  );
  const subsMap = new Map<string, { nome: string; sedute_totali: number | null }>();
  if (refIds.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, nome, sedute_totali")
      .in("id", refIds);
    for (const s of subs || []) {
      subsMap.set(s.id as string, {
        nome: (s.nome as string) || "",
        sedute_totali: (s.sedute_totali as number | null) ?? null,
      });
    }
  }

  return rows
    .map((r) => {
      const tx = pickOneTx(r.transactions);
      if (!tx) return null;
      const client = pickOneClient(tx.clients);
      const qty = Number(r.quantity) || 1;
      const unit = Number(r.unit_price) || 0;
      const sub = r.ref_id ? subsMap.get(r.ref_id) : null;
      return {
        id: r.id,
        data: tx.data,
        clientId: tx.client_id,
        clientName: client
          ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim() || null
          : null,
        subscriptionName: sub?.nome || r.label,
        seduteTotali: sub?.sedute_totali ?? null,
        prezzo: Math.round(qty * unit * 100) / 100,
        metodoPagamento: tx.metodo_pagamento,
      } satisfies SubscriptionSaleRow;
    })
    .filter((r): r is SubscriptionSaleRow => r !== null)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}
