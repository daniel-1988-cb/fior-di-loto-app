"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidDate } from "@/lib/security/validate";

// ============================================
// Fase 5 — Reports & Analytics
//
// Server actions di pura lettura per le dashboard analytics.
// NON tocca transactions/vendite/clients/staff actions esistenti.
// Firma funzioni coerente con il dispatch della fase (KpiOverview /
// CashFlow / Cohort / Staff / Service performance).
// ============================================

export type Periodo = { from: string; to: string };

// ---------- helpers ----------

function sanitizePeriodo(p: Periodo): Periodo {
  const now = new Date();
  const fallbackTo = now.toISOString().slice(0, 10);
  const fallbackFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const from = isValidDate(p?.from) ? p.from : fallbackFrom;
  const to = isValidDate(p?.to) ? p.to : fallbackTo;
  // if reversed, swap
  if (from > to) return { from: to, to: from };
  return { from, to };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Ritorna il periodo "equivalente" precedente (stessa durata, immediately before). */
function previousEquivalentPeriod(p: Periodo): Periodo {
  const start = new Date(p.from + "T00:00:00");
  const end = new Date(p.to + "T00:00:00");
  const len = daysBetween(p.from, p.to); // inclusive-ish
  const newEnd = addDays(start, -1);
  const newStart = addDays(newEnd, -len);
  return { from: ymd(newStart), to: ymd(newEnd) };
}

// ============================================
// getKpiOverview
// ============================================

export type KpiOverview = {
  fatturatoTotale: number;
  fatturatoMesePrec: number;
  clientiAttivi: number;
  nuoviClienti: number;
  appuntamentiCompletati: number;
  ticketMedio: number;
  topServizi: Array<{ nome: string; count: number; fatturato: number }>;
  topProdotti: Array<{ nome: string; qty: number; fatturato: number }>;
};

const EMPTY_KPI: KpiOverview = {
  fatturatoTotale: 0,
  fatturatoMesePrec: 0,
  clientiAttivi: 0,
  nuoviClienti: 0,
  appuntamentiCompletati: 0,
  ticketMedio: 0,
  topServizi: [],
  topProdotti: [],
};

export async function getKpiOverview(p: Periodo): Promise<KpiOverview> {
  try {
    return await _getKpiOverviewInner(p);
  } catch (err) {
    console.error("[reports] getKpiOverview failed:", err);
    return EMPTY_KPI;
  }
}

async function _getKpiOverviewInner(p: Periodo): Promise<KpiOverview> {
  const period = sanitizePeriodo(p);
  const prev = previousEquivalentPeriod(period);
  const supabase = createAdminClient();

  const [
    { data: entrateRows, error: e1 },
    { data: entratePrevRows, error: e2 },
    { data: aptCompletRows, error: e3 },
    { data: nuoviClientiRows, error: e4 },
    { data: clientiAttiviRows, error: e5 },
    { data: itemsRows, error: e6 },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("importo")
      .eq("tipo", "entrata")
      .gte("data", period.from)
      .lte("data", period.to),
    supabase
      .from("transactions")
      .select("importo")
      .eq("tipo", "entrata")
      .gte("data", prev.from)
      .lte("data", prev.to),
    supabase
      .from("appointments")
      .select("id, client_id")
      .eq("stato", "completato")
      .gte("data", period.from)
      .lte("data", period.to),
    supabase
      .from("clients")
      .select("id")
      .gte("created_at", `${period.from}T00:00:00`)
      .lte("created_at", `${period.to}T23:59:59`),
    supabase
      .from("transactions")
      .select("client_id")
      .eq("tipo", "entrata")
      .not("client_id", "is", null)
      .gte("data", period.from)
      .lte("data", period.to),
    supabase
      .from("transaction_items")
      .select("kind, label, ref_id, quantity, unit_price, transactions!inner(data, tipo)")
      .eq("transactions.tipo", "entrata")
      .gte("transactions.data", period.from)
      .lte("transactions.data", period.to),
  ]);

  // Log query errors but don't throw — render con dati parziali
  if (e1) console.warn("[reports] entrate query error:", e1);
  if (e2) console.warn("[reports] entrate prev query error:", e2);
  if (e3) console.warn("[reports] appt query error:", e3);
  if (e4) console.warn("[reports] nuovi clienti query error:", e4);
  if (e5) console.warn("[reports] clienti attivi query error:", e5);
  if (e6) console.warn("[reports] items query error:", e6);

  const fatturatoTotale = (entrateRows || []).reduce(
    (s, r) => s + Number(r.importo || 0),
    0,
  );
  const fatturatoMesePrec = (entratePrevRows || []).reduce(
    (s, r) => s + Number(r.importo || 0),
    0,
  );

  const appuntamentiCompletati = (aptCompletRows || []).length;

  const clientiAttiviSet = new Set<string>();
  for (const row of clientiAttiviRows || []) {
    if (row.client_id) clientiAttiviSet.add(String(row.client_id));
  }
  // Add clients from completed appointments as a fallback
  for (const row of aptCompletRows || []) {
    if (row.client_id) clientiAttiviSet.add(String(row.client_id));
  }
  const clientiAttivi = clientiAttiviSet.size;

  const nuoviClienti = (nuoviClientiRows || []).length;

  const ticketMedio =
    (entrateRows || []).length > 0
      ? fatturatoTotale / (entrateRows || []).length
      : 0;

  // Aggregate top servizi / prodotti from transaction_items
  type ItemRow = {
    kind?: string | null;
    label?: string | null;
    ref_id?: string | null;
    quantity?: number | null;
    unit_price?: number | string | null;
  };
  const serviziMap = new Map<string, { nome: string; count: number; fatturato: number }>();
  const prodottiMap = new Map<string, { nome: string; qty: number; fatturato: number }>();

  for (const r of (itemsRows || []) as ItemRow[]) {
    const qty = Number(r.quantity || 0);
    const totale = qty * Number(r.unit_price || 0);
    const key = String(r.ref_id || r.label || "—");
    if (r.kind === "servizio") {
      if (!serviziMap.has(key)) serviziMap.set(key, { nome: r.label || "—", count: 0, fatturato: 0 });
      const e = serviziMap.get(key)!;
      e.count += qty;
      e.fatturato += totale;
    } else if (r.kind === "prodotto") {
      if (!prodottiMap.has(key)) prodottiMap.set(key, { nome: r.label || "—", qty: 0, fatturato: 0 });
      const e = prodottiMap.get(key)!;
      e.qty += qty;
      e.fatturato += totale;
    }
  }

  const topServizi = Array.from(serviziMap.values())
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, 5);
  const topProdotti = Array.from(prodottiMap.values())
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, 5);

  return {
    fatturatoTotale,
    fatturatoMesePrec,
    clientiAttivi,
    nuoviClienti,
    appuntamentiCompletati,
    ticketMedio,
    topServizi,
    topProdotti,
  };
}

// ============================================
// getCashFlow
// ============================================

export type CashFlow = {
  byDay: Array<{ data: string; entrate: number; uscite: number; netto: number }>;
  totale: { entrate: number; uscite: number; netto: number; margine: number };
};

const EMPTY_CASH_FLOW: CashFlow = {
  byDay: [],
  totale: { entrate: 0, uscite: 0, netto: 0, margine: 0 },
};

export async function getCashFlow(p: Periodo): Promise<CashFlow> {
  try {
    return await _getCashFlowInner(p);
  } catch (err) {
    console.error("[reports] getCashFlow failed:", err);
    return EMPTY_CASH_FLOW;
  }
}

async function _getCashFlowInner(p: Periodo): Promise<CashFlow> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("transactions")
    .select("data, tipo, importo")
    .gte("data", period.from)
    .lte("data", period.to);

  // Build all days in range so chart is continuous even with no data
  const byDayMap = new Map<string, { data: string; entrate: number; uscite: number; netto: number }>();
  const start = new Date(period.from + "T00:00:00");
  const end = new Date(period.to + "T00:00:00");
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const key = ymd(d);
    byDayMap.set(key, { data: key, entrate: 0, uscite: 0, netto: 0 });
  }

  for (const r of rows || []) {
    const key = String(r.data).slice(0, 10);
    if (!byDayMap.has(key)) {
      byDayMap.set(key, { data: key, entrate: 0, uscite: 0, netto: 0 });
    }
    const e = byDayMap.get(key)!;
    const imp = Number(r.importo || 0);
    if (r.tipo === "entrata") e.entrate += imp;
    else if (r.tipo === "uscita") e.uscite += imp;
  }
  for (const e of byDayMap.values()) {
    e.netto = e.entrate - e.uscite;
  }

  const byDay = Array.from(byDayMap.values()).sort((a, b) => (a.data < b.data ? -1 : 1));
  const entrate = byDay.reduce((s, d) => s + d.entrate, 0);
  const uscite = byDay.reduce((s, d) => s + d.uscite, 0);
  const netto = entrate - uscite;
  const margine = entrate > 0 ? (netto / entrate) * 100 : 0;

  return {
    byDay,
    totale: { entrate, uscite, netto, margine },
  };
}

// ============================================
// getCohortRetention
// ============================================

export type CohortRetention = {
  cohorts: Array<{
    mese: string; // "2026-01"
    size: number;
    retention: number[]; // [M0, M1, M2, ...] % ritorni per mese successivo
  }>;
};

export async function getCohortRetention(year: number): Promise<CohortRetention> {
  try {
    return await _getCohortRetentionInner(year);
  } catch (err) {
    console.error("[reports] getCohortRetention failed:", err);
    return { cohorts: [] };
  }
}

async function _getCohortRetentionInner(year: number): Promise<CohortRetention> {
  const safeYear =
    Number.isFinite(year) && year >= 2020 && year <= 2100 ? Math.floor(year) : new Date().getFullYear();

  const supabase = createAdminClient();

  // Window: anno safeYear + dati fino a fine anno corrente per poter
  // calcolare retention successiva.
  const windowFrom = `${safeYear}-01-01`;
  const nowYear = new Date().getFullYear();
  const windowTo = `${Math.max(safeYear + 1, nowYear)}-12-31`;

  const { data: rows } = await supabase
    .from("transactions")
    .select("client_id, data")
    .eq("tipo", "entrata")
    .not("client_id", "is", null)
    .gte("data", windowFrom)
    .lte("data", windowTo);

  // Determine for each client: first purchase month + set of months with purchase
  const firstByClient = new Map<string, string>(); // clientId -> "YYYY-MM"
  const monthsByClient = new Map<string, Set<string>>();

  for (const r of rows || []) {
    const cid = String(r.client_id);
    const month = String(r.data).slice(0, 7);
    if (!firstByClient.has(cid) || month < firstByClient.get(cid)!) {
      firstByClient.set(cid, month);
    }
    if (!monthsByClient.has(cid)) monthsByClient.set(cid, new Set());
    monthsByClient.get(cid)!.add(month);
  }

  // Group clients by cohort month (only those whose first purchase falls in safeYear)
  const cohortMembers = new Map<string, string[]>(); // "YYYY-MM" -> clientIds
  for (const [cid, first] of firstByClient.entries()) {
    if (!first.startsWith(String(safeYear))) continue;
    if (!cohortMembers.has(first)) cohortMembers.set(first, []);
    cohortMembers.get(first)!.push(cid);
  }

  // Build cohort rows Jan..Dec
  const cohorts: CohortRetention["cohorts"] = [];
  for (let m = 1; m <= 12; m++) {
    const cohortMonth = `${safeYear}-${String(m).padStart(2, "0")}`;
    const members = cohortMembers.get(cohortMonth) || [];
    const size = members.length;

    // Retention: M0 is always 100% (the cohort month itself).
    // For M1..M12 compute % of members who had ANY purchase in that offset month.
    const retention: number[] = [];
    for (let offset = 0; offset <= 12; offset++) {
      // target month = cohortMonth + offset months
      const targetDate = new Date(safeYear, m - 1 + offset, 1);
      const targetMonth = ym(targetDate);
      // if targetMonth is in the future beyond windowTo slice, mark as NaN-equivalent => 0
      // but keep it for layout; caller can decide how to render.
      if (size === 0) {
        retention.push(0);
        continue;
      }
      let retained = 0;
      for (const cid of members) {
        const ms = monthsByClient.get(cid);
        if (ms && ms.has(targetMonth)) retained++;
      }
      const pct = (retained / size) * 100;
      retention.push(Math.round(pct * 10) / 10);
    }

    cohorts.push({ mese: cohortMonth, size, retention });
  }

  return { cohorts };
}

// ============================================
// getStaffPerformance (Fase 5 — firma periodo-based)
//
// Nota: esiste già `getStaffPerformance` in `dashboard.ts` che calcola
// sul mese corrente. Quella viene lasciata intatta (usata in rendimento/home).
// Qui esponiamo la versione con firma Periodo richiesta dal dispatch.
// ============================================

export type StaffPerformanceRow = {
  staffId: string;
  nome: string;
  appuntamenti: number;
  fatturato: number;
  clientiUnici: number;
  mediaCliente: number;
};

export async function getStaffPerformance(p: Periodo): Promise<StaffPerformanceRow[]> {
  try {
    return await _getStaffPerformanceInner(p);
  } catch (err) {
    console.error("[reports] getStaffPerformance failed:", err);
    return [];
  }
}

async function _getStaffPerformanceInner(p: Periodo): Promise<StaffPerformanceRow[]> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const [{ data: staffRows }, { data: aptRows }] = await Promise.all([
    supabase.from("staff").select("id, nome, cognome"),
    supabase
      .from("appointments")
      .select("staff_id, client_id, services(prezzo)")
      .eq("stato", "completato")
      .gte("data", period.from)
      .lte("data", period.to)
      .not("staff_id", "is", null),
  ]);

  const staffMap = new Map<string, { nome: string }>();
  for (const s of staffRows || []) {
    const nomeFull = `${s.nome ?? ""} ${s.cognome ?? ""}`.trim() || "—";
    staffMap.set(String(s.id), { nome: nomeFull });
  }

  // Aggregate
  type Agg = { appuntamenti: number; fatturato: number; clienti: Set<string> };
  const agg = new Map<string, Agg>();
  for (const r of aptRows || []) {
    const sid = String(r.staff_id);
    if (!agg.has(sid)) agg.set(sid, { appuntamenti: 0, fatturato: 0, clienti: new Set() });
    const a = agg.get(sid)!;
    a.appuntamenti += 1;
    const serv = r.services as { prezzo?: number | string | null } | null;
    a.fatturato += Number(serv?.prezzo || 0);
    if (r.client_id) a.clienti.add(String(r.client_id));
  }

  const rows: StaffPerformanceRow[] = [];
  for (const [sid, a] of agg.entries()) {
    const info = staffMap.get(sid);
    if (!info) continue;
    const clientiUnici = a.clienti.size;
    rows.push({
      staffId: sid,
      nome: info.nome,
      appuntamenti: a.appuntamenti,
      fatturato: a.fatturato,
      clientiUnici,
      mediaCliente: clientiUnici > 0 ? a.fatturato / clientiUnici : 0,
    });
  }
  return rows.sort((x, y) => y.fatturato - x.fatturato);
}

// ============================================
// getServicePerformance
// ============================================

export type ServicePerformanceRow = {
  serviceId: string;
  nome: string;
  categoria: string;
  count: number;
  fatturato: number;
  mediaPrezzo: number;
};

export async function getServicePerformance(p: Periodo): Promise<ServicePerformanceRow[]> {
  try {
    return await _getServicePerformanceInner(p);
  } catch (err) {
    console.error("[reports] getServicePerformance failed:", err);
    return [];
  }
}

async function _getServicePerformanceInner(p: Periodo): Promise<ServicePerformanceRow[]> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("appointments")
    .select("service_id, services(id, nome, categoria, prezzo)")
    .eq("stato", "completato")
    .gte("data", period.from)
    .lte("data", period.to)
    .not("service_id", "is", null);

  type Agg = { nome: string; categoria: string; count: number; fatturato: number };
  const map = new Map<string, Agg>();
  for (const r of rows || []) {
    const s = r.services as
      | { id?: string; nome?: string; categoria?: string; prezzo?: number | string | null }
      | null;
    if (!s?.id) continue;
    const key = String(s.id);
    if (!map.has(key)) {
      map.set(key, {
        nome: s.nome || "—",
        categoria: s.categoria || "—",
        count: 0,
        fatturato: 0,
      });
    }
    const e = map.get(key)!;
    e.count += 1;
    e.fatturato += Number(s.prezzo || 0);
  }

  return Array.from(map.entries())
    .map(([serviceId, e]) => ({
      serviceId,
      nome: e.nome,
      categoria: e.categoria,
      count: e.count,
      fatturato: e.fatturato,
      mediaPrezzo: e.count > 0 ? e.fatturato / e.count : 0,
    }))
    .sort((a, b) => b.fatturato - a.fatturato);
}
