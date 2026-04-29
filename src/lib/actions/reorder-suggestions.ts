"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ReorderUrgency = "critical" | "high" | "medium" | "low";

export type ReorderSuggestion = {
  productId: string;
  nome: string;
  categoria: string | null;
  giacenza: number;
  sogliaAlert: number | null;
  prezzo: number;
  // Storico
  totalSold: number; // unità vendute nella finestra di osservazione
  observationDays: number; // finestra effettiva (es. 90)
  avgDailyConsumption: number;
  daysRemaining: number | null; // null se avgDaily = 0 (nessuna vendita)
  // Stagionalità (Sprint 2)
  seasonalWeight: number; // 1.0 = baseline, >1 alta stagione, <1 bassa
  seasonalAdjustedDailyConsumption: number; // avgDaily × seasonalWeight
  // Suggerimento
  suggestedReorderQty: number;
  suggestedReorderValue: number; // qty * prezzo
  urgency: ReorderUrgency;
};

export type ReorderOptions = {
  /** Finestra di osservazione storico vendite. Default 90gg. */
  observationDays?: number;
  /** Quanti giorni di copertura vogliamo mantenere = lead-time + buffer. Default 60gg. */
  targetCoverageDays?: number;
  /** Soglia in giorni sotto la quale suggeriamo riordino. Default 30gg. */
  alertThresholdDays?: number;
};

type SalesAggRow = {
  product_id: string;
  total_sold: number | string;
};

type ProductRow = {
  id: string;
  nome: string;
  categoria: string | null;
  giacenza: number | null;
  soglia_alert: number | null;
  prezzo: number | string | null;
};

/**
 * Calcola suggerimenti di riordino basati sulla velocità di consumo storica.
 *
 *   avg_daily   = unità vendute (ultimi N gg) / N
 *   days_left   = giacenza / avg_daily   (∞ se avg_daily = 0)
 *   suggested   = max(0, target_coverage * avg_daily - giacenza)
 *   urgency     = critical (giacenza=0) > high (<7gg) > medium (<15gg) > low (<30gg)
 *
 * Filtri inclusi nei risultati:
 *  - Prodotti attivi
 *  - giacenza = 0 (esaurito) → sempre incluso, urgency=critical
 *  - days_left < alertThresholdDays → incluso
 *  - prodotti senza vendite ma sotto soglia_alert → incluso (low priority, qty = 2x soglia)
 */
export async function getReorderSuggestions(
  opts: ReorderOptions = {},
): Promise<ReorderSuggestion[]> {
  const observationDays = opts.observationDays ?? 90;
  const targetCoverageDays = opts.targetCoverageDays ?? 60;
  const alertThresholdDays = opts.alertThresholdDays ?? 30;

  const supabase = createAdminClient();

  // 1. Prodotti attivi
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, nome, categoria, giacenza, soglia_alert, prezzo")
    .eq("attivo", true);
  if (prodErr || !products) {
    console.error("[reorder] products query error:", prodErr);
    return [];
  }

  // 2. Vendite aggregate ultimi N giorni — kind='product' con ref_id valorizzato
  const cutoff = new Date(
    Date.now() - observationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: sales, error: salesErr } = await supabase
    .from("transaction_items")
    .select("ref_id, quantity")
    .eq("kind", "product")
    .not("ref_id", "is", null)
    .gte("created_at", cutoff);
  if (salesErr) {
    console.error("[reorder] sales query error:", salesErr);
    // Continuiamo con vendite=0 invece di abortire
  }

  // Aggregate by product_id
  const salesByProduct = new Map<string, number>();
  for (const r of (sales ?? []) as Array<{
    ref_id: string | null;
    quantity: number;
  }>) {
    if (!r.ref_id) continue;
    salesByProduct.set(
      r.ref_id,
      (salesByProduct.get(r.ref_id) ?? 0) + Number(r.quantity ?? 0),
    );
  }

  // 3. Pesi stagionali per il mese di consegna previsto.
  //    Target month = mese corrente + ~half lead time. Approssimiamo a +30gg
  //    (lead-time medio fornitori non ancora in DB).
  const targetMonth =
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getMonth() + 1; // 1-12
  type WeightRow = { product_id: string; weight: number | string };
  // seasonal_weights non in generated types — cast as never
  const { data: weights, error: weightsErr } = await supabase
    .from("seasonal_weights" as never)
    .select("product_id, weight")
    .eq("month" as never, targetMonth as never);
  if (weightsErr) {
    console.error("[reorder] seasonal_weights query error:", weightsErr);
  }
  const seasonalByProduct = new Map<string, number>();
  for (const w of (weights ?? []) as WeightRow[]) {
    seasonalByProduct.set(w.product_id, Number(w.weight) || 1);
  }

  const out: ReorderSuggestion[] = [];

  for (const p of products as ProductRow[]) {
    const giacenza = Number(p.giacenza ?? 0);
    const sogliaAlert = p.soglia_alert == null ? null : Number(p.soglia_alert);
    const prezzo = Number(p.prezzo ?? 0);
    const totalSold = salesByProduct.get(p.id) ?? 0;
    const avgDaily = totalSold / observationDays;
    // Applica peso stagionale per il mese di consegna previsto
    const seasonalWeight = seasonalByProduct.get(p.id) ?? 1;
    const seasonalAvgDaily = avgDaily * seasonalWeight;
    const daysRemaining =
      seasonalAvgDaily > 0 ? giacenza / seasonalAvgDaily : null;

    const isOut = giacenza === 0;
    const isUnderAlertThreshold =
      daysRemaining !== null && daysRemaining < alertThresholdDays;
    const isUnderStaticSoglia =
      sogliaAlert !== null && giacenza <= sogliaAlert;

    // Skip se non ricade in nessuna delle condizioni di alert
    if (!isOut && !isUnderAlertThreshold && !isUnderStaticSoglia) {
      continue;
    }

    // Quantità suggerita:
    //  - Con storico vendite: copri targetCoverageDays di consumo (stagionale) - giacenza
    //  - Senza storico ma sotto soglia: 2x soglia - giacenza (fallback prudente)
    let suggestedQty: number;
    if (seasonalAvgDaily > 0) {
      suggestedQty = Math.max(
        0,
        Math.ceil(targetCoverageDays * seasonalAvgDaily - giacenza),
      );
    } else if (sogliaAlert !== null) {
      suggestedQty = Math.max(0, 2 * sogliaAlert - giacenza);
    } else {
      suggestedQty = Math.max(0, 5 - giacenza); // default minimo
    }

    // Urgency
    let urgency: ReorderUrgency;
    if (isOut) urgency = "critical";
    else if (daysRemaining !== null && daysRemaining < 7) urgency = "high";
    else if (daysRemaining !== null && daysRemaining < 15) urgency = "medium";
    else urgency = "low";

    out.push({
      productId: p.id,
      nome: p.nome,
      categoria: p.categoria,
      giacenza,
      sogliaAlert,
      prezzo,
      totalSold,
      observationDays,
      avgDailyConsumption: avgDaily,
      daysRemaining,
      seasonalWeight,
      seasonalAdjustedDailyConsumption: seasonalAvgDaily,
      suggestedReorderQty: suggestedQty,
      suggestedReorderValue: suggestedQty * prezzo,
      urgency,
    });
  }

  // Sort by urgency rank, poi giacenza ASC
  const urgencyRank: Record<ReorderUrgency, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  out.sort((a, b) => {
    if (a.urgency !== b.urgency) return urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (a.giacenza !== b.giacenza) return a.giacenza - b.giacenza;
    return a.nome.localeCompare(b.nome);
  });

  return out;
}

/**
 * Aggregati per le metriche header della pagina riordino.
 */
export async function getReorderStats(opts: ReorderOptions = {}): Promise<{
  count: number;
  critical: number;
  totalValue: number;
}> {
  const suggestions = await getReorderSuggestions(opts);
  return {
    count: suggestions.length,
    critical: suggestions.filter((s) => s.urgency === "critical").length,
    totalValue: suggestions.reduce((sum, s) => sum + s.suggestedReorderValue, 0),
  };
}

