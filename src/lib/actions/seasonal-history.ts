"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ProductMonthlySales = {
  productId: string;
  nome: string;
  categoria: string | null;
  /** Vendite medie per mese (12 valori, indice 0=gennaio). Calcolata su tutti
   *  gli anni con storico, divisa per il numero di anni unici osservati. */
  avgByMonth: number[];
  /** Vendite totali raggruppate per anno → 12 valori per ogni anno. */
  byYear: Record<number, number[]>;
  /** Vendite totali ultimi 12 mesi rolling. */
  last12mTotal: number;
  /** Anni distinti con almeno una vendita. */
  yearsActive: number;
  /** Mese con vendite medie più alte (1-12) e valore. */
  peakMonth: number;
  peakValue: number;
};

export type SeasonalHistoryFilter = {
  /** Solo prodotti attivi (default true). */
  attiviSolo?: boolean;
  /** Filtra per marchio/categoria. */
  categoria?: string;
};

/**
 * Aggrega lo storico vendite per prodotto × mese × anno.
 * Sorgente: transaction_items kind='product' con ref_id valorizzato
 * (gli import Fresha 2020-2026 e i futuri inserimenti dal gestionale).
 *
 * Output ordinato per `last12mTotal` decrescente (i più "caldi" in cima).
 */
export async function getProductMonthlySales(
  filter: SeasonalHistoryFilter = {},
): Promise<ProductMonthlySales[]> {
  const attiviSolo = filter.attiviSolo ?? true;
  const supabase = createAdminClient();

  // 1. Carica prodotti
  let prodQuery = supabase
    .from("products")
    .select("id, nome, categoria, attivo");
  if (attiviSolo) prodQuery = prodQuery.eq("attivo", true);
  if (filter.categoria) prodQuery = prodQuery.eq("categoria", filter.categoria);
  const { data: products, error: prodErr } = await prodQuery;
  if (prodErr || !products) {
    console.error("[seasonal-history] products error:", prodErr);
    return [];
  }
  const productById = new Map<
    string,
    { nome: string; categoria: string | null }
  >();
  for (const p of products as Array<{
    id: string;
    nome: string;
    categoria: string | null;
  }>) {
    productById.set(p.id, { nome: p.nome, categoria: p.categoria });
  }

  // 2. Vendite con date — paginate to handle large datasets (Supabase default limit is 1000)
  type SaleRow = {
    ref_id: string | null;
    quantity: number | null;
    created_at: string;
  };
  const sales: SaleRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("transaction_items")
      .select("ref_id, quantity, created_at")
      .eq("kind", "product")
      .not("ref_id", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[seasonal-history] sales page error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    sales.push(...(data as SaleRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // 3. Aggrega
  const now = new Date();
  const cutoffLast12m = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );

  // For each product: byYear[year] = [12 numbers]
  const agg = new Map<
    string,
    {
      byYear: Map<number, number[]>;
      last12m: number;
      yearsSet: Set<number>;
    }
  >();

  for (const r of sales) {
    if (!r.ref_id) continue;
    if (!productById.has(r.ref_id)) continue;
    const dt = new Date(r.created_at);
    const year = dt.getFullYear();
    const month0 = dt.getMonth(); // 0-11
    const qty = Number(r.quantity ?? 0);

    let entry = agg.get(r.ref_id);
    if (!entry) {
      entry = { byYear: new Map(), last12m: 0, yearsSet: new Set() };
      agg.set(r.ref_id, entry);
    }
    let monthlyArr = entry.byYear.get(year);
    if (!monthlyArr) {
      monthlyArr = new Array(12).fill(0);
      entry.byYear.set(year, monthlyArr);
    }
    monthlyArr[month0] += qty;
    entry.yearsSet.add(year);
    if (dt.getTime() >= cutoffLast12m.getTime()) {
      entry.last12m += qty;
    }
  }

  // 4. Compute avg per month + meta
  const out: ProductMonthlySales[] = [];
  for (const [productId, prod] of productById.entries()) {
    const e = agg.get(productId);
    if (!e || e.yearsSet.size === 0) {
      // Prodotto senza storico
      out.push({
        productId,
        nome: prod.nome,
        categoria: prod.categoria,
        avgByMonth: new Array(12).fill(0),
        byYear: {},
        last12mTotal: 0,
        yearsActive: 0,
        peakMonth: 0,
        peakValue: 0,
      });
      continue;
    }
    const numYears = e.yearsSet.size;
    const sumByMonth = new Array(12).fill(0);
    const byYearObj: Record<number, number[]> = {};
    for (const [year, arr] of e.byYear.entries()) {
      byYearObj[year] = [...arr];
      for (let m = 0; m < 12; m++) sumByMonth[m] += arr[m];
    }
    const avgByMonth = sumByMonth.map((s) => s / numYears);
    let peakMonth = 1;
    let peakValue = avgByMonth[0] ?? 0;
    for (let m = 1; m < 12; m++) {
      if (avgByMonth[m] > peakValue) {
        peakValue = avgByMonth[m];
        peakMonth = m + 1;
      }
    }
    out.push({
      productId,
      nome: prod.nome,
      categoria: prod.categoria,
      avgByMonth,
      byYear: byYearObj,
      last12mTotal: e.last12m,
      yearsActive: numYears,
      peakMonth,
      peakValue,
    });
  }

  // Sort: prodotti con storico in cima ordinati per total ultimi 12 mesi desc,
  // poi quelli senza storico alfabetici
  out.sort((a, b) => {
    if (a.yearsActive === 0 && b.yearsActive > 0) return 1;
    if (b.yearsActive === 0 && a.yearsActive > 0) return -1;
    if (a.last12mTotal !== b.last12mTotal) return b.last12mTotal - a.last12mTotal;
    return a.nome.localeCompare(b.nome);
  });
  return out;
}

/** Lista categorie distinte presenti su prodotti attivi — per filtro UI. */
export async function getProductCategorie(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("categoria")
    .eq("attivo", true)
    .not("categoria", "is", null);
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ categoria: string | null }>) {
    if (r.categoria) set.add(r.categoria);
  }
  return Array.from(set).sort();
}
