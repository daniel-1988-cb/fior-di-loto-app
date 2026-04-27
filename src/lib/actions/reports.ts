"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidDate } from "@/lib/security/validate";
import { safeReportAction } from "@/lib/reports/safe-action";

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
  return safeReportAction("getKpiOverview", () => _getKpiOverviewInner(p), EMPTY_KPI);
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
  return safeReportAction("getCashFlow", () => _getCashFlowInner(p), EMPTY_CASH_FLOW);
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
  return safeReportAction("getCohortRetention", () => _getCohortRetentionInner(year), { cohorts: [] });
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
  return safeReportAction("getStaffPerformance", () => _getStaffPerformanceInner(p), []);
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
  return safeReportAction("getServicePerformance", () => _getServicePerformanceInner(p), []);
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

// ============================================
// getDashboardOverview
// ============================================

export type DashboardOverview = {
  pagamentiBreakdown: Array<{ metodo: string; importo: number; count: number }>;
  appOperativi: {
    totali: number;
    completati: number;
    cancellati: number;
    noShow: number;
    confermati: number;
    mediaPerGiorno: number;
  };
};

const EMPTY_DASHBOARD_OVERVIEW: DashboardOverview = {
  pagamentiBreakdown: [],
  appOperativi: {
    totali: 0,
    completati: 0,
    cancellati: 0,
    noShow: 0,
    confermati: 0,
    mediaPerGiorno: 0,
  },
};

export async function getDashboardOverview(p: Periodo): Promise<DashboardOverview> {
  return safeReportAction(
    "getDashboardOverview",
    () => _getDashboardOverviewInner(p),
    EMPTY_DASHBOARD_OVERVIEW,
  );
}

async function _getDashboardOverviewInner(p: Periodo): Promise<DashboardOverview> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const [{ data: transRows }, { data: aptRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("metodo_pagamento, importo")
      .eq("tipo", "entrata")
      .gte("data", period.from)
      .lte("data", period.to),
    supabase
      .from("appointments")
      .select("stato")
      .gte("data", period.from)
      .lte("data", period.to),
  ]);

  // --- Pagamenti breakdown ---
  const metodoMap = new Map<string, { importo: number; count: number }>();
  for (const r of transRows || []) {
    const key = r.metodo_pagamento || "altro";
    if (!metodoMap.has(key)) metodoMap.set(key, { importo: 0, count: 0 });
    const e = metodoMap.get(key)!;
    e.importo += Number(r.importo || 0);
    e.count += 1;
  }
  const pagamentiBreakdown = Array.from(metodoMap.entries())
    .map(([metodo, v]) => ({ metodo, importo: v.importo, count: v.count }))
    .sort((a, b) => b.importo - a.importo);

  // --- Appuntamenti operativi ---
  let totali = 0;
  let completati = 0;
  let cancellati = 0;
  let noShow = 0;
  let confermati = 0;
  for (const r of aptRows || []) {
    totali += 1;
    if (r.stato === "completato") completati += 1;
    else if (r.stato === "cancellato") cancellati += 1;
    else if (r.stato === "no_show") noShow += 1;
    else if (r.stato === "confermato") confermati += 1;
  }

  const giorni = Math.max(1, daysBetween(period.from, period.to) + 1);
  const mediaPerGiorno = Math.round((totali / giorni) * 10) / 10;

  return {
    pagamentiBreakdown,
    appOperativi: { totali, completati, cancellati, noShow, confermati, mediaPerGiorno },
  };
}

// ============================================
// getClientReport
// ============================================

export type ClientReport = {
  clientiAttivi: number;
  nuoviClienti: number;
  retentionRate: number; // 0..1
  ltv_medio: number;
  segmenti: Array<{ segmento: string; count: number }>;
  topLtv: Array<{
    clientId: string;
    nome: string;
    cognome: string;
    segmento: string;
    visite: number;
    spesa: number;
    ultimaVisita: string | null;
  }>;
  spesaDistribution: Array<{ bin: string; count: number }>;
};

const EMPTY_CLIENT_REPORT: ClientReport = {
  clientiAttivi: 0,
  nuoviClienti: 0,
  retentionRate: 0,
  ltv_medio: 0,
  segmenti: [],
  topLtv: [],
  spesaDistribution: [],
};

export async function getClientReport(p: Periodo): Promise<ClientReport> {
  return safeReportAction("getClientReport", () => _getClientReportInner(p), EMPTY_CLIENT_REPORT);
}

async function _getClientReportInner(p: Periodo): Promise<ClientReport> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  // Previous month (same length as period) for retention calculation
  const prev = previousEquivalentPeriod(period);

  const [
    { data: transRows, error: e1 },
    { data: nuoviRows, error: e2 },
    { data: prevTransRows, error: e3 },
    { data: segmentoRows, error: e4 },
    { data: aptRows, error: e5 },
  ] = await Promise.all([
    // All entrate in period: client_id + importo + data
    supabase
      .from("transactions")
      .select("client_id, importo, data")
      .eq("tipo", "entrata")
      .not("client_id", "is", null)
      .gte("data", period.from)
      .lte("data", period.to),
    // New clients in period
    supabase
      .from("clients")
      .select("id")
      .gte("created_at", `${period.from}T00:00:00`)
      .lte("created_at", `${period.to}T23:59:59`),
    // Clients with a purchase in the previous equivalent period (for retention)
    supabase
      .from("transactions")
      .select("client_id")
      .eq("tipo", "entrata")
      .not("client_id", "is", null)
      .gte("data", prev.from)
      .lte("data", prev.to),
    // All clients for segmento distribution
    supabase.from("clients").select("id, segmento, nome, cognome"),
    // Completed appointments in period: client_id + data
    supabase
      .from("appointments")
      .select("client_id, data")
      .eq("stato", "completato")
      .not("client_id", "is", null)
      .gte("data", period.from)
      .lte("data", period.to),
  ]);

  if (e1) console.warn("[reports] getClientReport transRows:", e1);
  if (e2) console.warn("[reports] getClientReport nuoviRows:", e2);
  if (e3) console.warn("[reports] getClientReport prevTransRows:", e3);
  if (e4) console.warn("[reports] getClientReport segmentoRows:", e4);
  if (e5) console.warn("[reports] getClientReport aptRows:", e5);

  // ---- Clienti attivi (union di chi ha speso o prenotato nel periodo) ----
  const attiviSet = new Set<string>();
  for (const r of transRows || []) {
    if (r.client_id) attiviSet.add(String(r.client_id));
  }
  for (const r of aptRows || []) {
    if (r.client_id) attiviSet.add(String(r.client_id));
  }
  const clientiAttivi = attiviSet.size;

  // ---- Nuovi clienti ----
  const nuoviClienti = (nuoviRows || []).length;

  // ---- Retention rate ----
  // clienti presenti nel periodo precedente che sono tornati nel periodo corrente
  const prevSet = new Set<string>();
  for (const r of prevTransRows || []) {
    if (r.client_id) prevSet.add(String(r.client_id));
  }
  let tornati = 0;
  for (const cid of prevSet) {
    if (attiviSet.has(cid)) tornati++;
  }
  const retentionRate = prevSet.size > 0 ? tornati / prevSet.size : 0;

  // ---- Segmenti distribution ----
  const segmentoMap = new Map<string, number>();
  for (const r of segmentoRows || []) {
    const seg = (r.segmento as string) || "nuova";
    segmentoMap.set(seg, (segmentoMap.get(seg) ?? 0) + 1);
  }
  const segmenti = Array.from(segmentoMap.entries())
    .map(([segmento, count]) => ({ segmento, count }))
    .sort((a, b) => b.count - a.count);

  // ---- LTV per cliente (spesa totale nel periodo) ----
  type LtvEntry = { spesa: number; ultimaVisita: string | null; visite: number };
  const ltvMap = new Map<string, LtvEntry>();

  for (const r of transRows || []) {
    const cid = String(r.client_id);
    if (!ltvMap.has(cid)) ltvMap.set(cid, { spesa: 0, ultimaVisita: null, visite: 0 });
    const e = ltvMap.get(cid)!;
    e.spesa += Number(r.importo || 0);
    const d = String(r.data).slice(0, 10);
    if (!e.ultimaVisita || d > e.ultimaVisita) e.ultimaVisita = d;
  }
  // Count visite from completed appointments
  for (const r of aptRows || []) {
    const cid = String(r.client_id);
    if (!ltvMap.has(cid)) ltvMap.set(cid, { spesa: 0, ultimaVisita: null, visite: 0 });
    const e = ltvMap.get(cid)!;
    e.visite += 1;
    const d = String(r.data).slice(0, 10);
    if (!e.ultimaVisita || d > e.ultimaVisita) e.ultimaVisita = d;
  }

  // Build client lookup from segmentoRows
  const clientMap = new Map<string, { nome: string; cognome: string; segmento: string }>();
  for (const r of segmentoRows || []) {
    clientMap.set(String(r.id), {
      nome: (r.nome as string) || "",
      cognome: (r.cognome as string) || "",
      segmento: (r.segmento as string) || "nuova",
    });
  }

  // Top 10 by spesa
  const topLtv = Array.from(ltvMap.entries())
    .map(([clientId, e]) => {
      const info = clientMap.get(clientId);
      return {
        clientId,
        nome: info?.nome || "—",
        cognome: info?.cognome || "",
        segmento: info?.segmento || "nuova",
        visite: e.visite,
        spesa: e.spesa,
        ultimaVisita: e.ultimaVisita,
      };
    })
    .sort((a, b) => b.spesa - a.spesa)
    .slice(0, 10);

  // ---- LTV medio ----
  const totalSpesa = Array.from(ltvMap.values()).reduce((s, e) => s + e.spesa, 0);
  const ltv_medio = ltvMap.size > 0 ? totalSpesa / ltvMap.size : 0;

  // ---- Spesa distribution (bins) ----
  const bins = [
    { bin: "0–50€", min: 0, max: 50 },
    { bin: "50–200€", min: 50, max: 200 },
    { bin: "200–500€", min: 200, max: 500 },
    { bin: "500€+", min: 500, max: Infinity },
  ];
  const spesaDistribution = bins.map(({ bin, min, max }) => ({
    bin,
    count: Array.from(ltvMap.values()).filter((e) => e.spesa >= min && e.spesa < max).length,
  }));

  return {
    clientiAttivi,
    nuoviClienti,
    retentionRate,
    ltv_medio,
    segmenti,
    topLtv,
    spesaDistribution,
  };
}

// ============================================
// getSalesReport (Wave 4 — /reports/vendite)
// ============================================

export type SalesReport = {
  fatturatoTotale: number;
  transazioni: number;
  ticketMedio: number;
  scontoTotale: number;
  topClienti: Array<{
    clientId: string;
    nome: string;
    cognome: string;
    visite: number;
    spesa: number;
    ticketMedio: number;
  }>;
  byKind: Array<{ kind: string; count: number; fatturato: number; pct: number }>;
  byDay: Array<{ data: string; fatturato: number }>;
};

const EMPTY_SALES_REPORT: SalesReport = {
  fatturatoTotale: 0,
  transazioni: 0,
  ticketMedio: 0,
  scontoTotale: 0,
  topClienti: [],
  byKind: [],
  byDay: [],
};

export async function getSalesReport(p: Periodo): Promise<SalesReport> {
  return safeReportAction("getSalesReport", () => _getSalesReportInner(p), EMPTY_SALES_REPORT);
}

async function _getSalesReportInner(p: Periodo): Promise<SalesReport> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const [
    { data: txRows, error: e1 },
    { data: itemRows, error: e2 },
    { data: clientRows, error: e3 },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, importo, client_id, data")
      .eq("tipo", "entrata")
      .gte("data", period.from)
      .lte("data", period.to),
    supabase
      .from("transaction_items")
      .select("kind, quantity, unit_price, transactions!inner(id, tipo)")
      .eq("transactions.tipo", "entrata")
      .gte("transactions.data", period.from)
      .lte("transactions.data", period.to),
    supabase.from("clients").select("id, nome, cognome"),
  ]);

  if (e1) console.warn("[reports] sales tx error:", e1);
  if (e2) console.warn("[reports] sales items error:", e2);
  if (e3) console.warn("[reports] sales clients error:", e3);

  const clientMap = new Map<string, { nome: string; cognome: string }>();
  for (const c of clientRows || []) {
    clientMap.set(String(c.id), { nome: c.nome || "", cognome: c.cognome || "" });
  }

  const fatturatoTotale = (txRows || []).reduce((s, r) => s + Number(r.importo || 0), 0);
  const transazioni = (txRows || []).length;
  const ticketMedio = transazioni > 0 ? fatturatoTotale / transazioni : 0;
  const scontoTotale = 0; // colonna sconto non presente nello schema transactions

  // Build daily trend from txRows
  const byDayMap = new Map<string, number>();
  const start = new Date(period.from + "T00:00:00");
  const end = new Date(period.to + "T00:00:00");
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    byDayMap.set(ymd(d), 0);
  }
  for (const r of txRows || []) {
    const day = String(r.data).slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + Number(r.importo || 0));
  }
  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data, fatturato]) => ({ data, fatturato: Math.round(fatturato) }));

  // Top 10 clienti per spesa
  type ClientAgg = { spesa: number; visite: number };
  const clientAgg = new Map<string, ClientAgg>();
  for (const r of txRows || []) {
    if (!r.client_id) continue;
    const cid = String(r.client_id);
    if (!clientAgg.has(cid)) clientAgg.set(cid, { spesa: 0, visite: 0 });
    const a = clientAgg.get(cid)!;
    a.spesa += Number(r.importo || 0);
    a.visite += 1;
  }
  const topClienti = Array.from(clientAgg.entries())
    .sort(([, a], [, b]) => b.spesa - a.spesa)
    .slice(0, 10)
    .map(([cid, a]) => {
      const info = clientMap.get(cid) ?? { nome: "—", cognome: "" };
      return {
        clientId: cid,
        nome: info.nome,
        cognome: info.cognome,
        visite: a.visite,
        spesa: a.spesa,
        ticketMedio: a.visite > 0 ? a.spesa / a.visite : 0,
      };
    });

  // Breakdown by kind from transaction_items
  type KindAgg = { count: number; fatturato: number };
  const kindMap = new Map<string, KindAgg>();
  type ItemRow = {
    kind?: string | null;
    quantity?: number | null;
    unit_price?: number | string | null;
  };
  for (const r of (itemRows || []) as ItemRow[]) {
    const kind = r.kind || "altro";
    if (!kindMap.has(kind)) kindMap.set(kind, { count: 0, fatturato: 0 });
    const a = kindMap.get(kind)!;
    const qty = Number(r.quantity || 0);
    a.count += qty;
    a.fatturato += qty * Number(r.unit_price || 0);
  }
  const kindTotal = Array.from(kindMap.values()).reduce((s, a) => s + a.fatturato, 0);
  const byKind = Array.from(kindMap.entries())
    .map(([kind, a]) => ({
      kind,
      count: a.count,
      fatturato: a.fatturato,
      pct: kindTotal > 0 ? (a.fatturato / kindTotal) * 100 : 0,
    }))
    .sort((a, b) => b.fatturato - a.fatturato);

  return { fatturatoTotale, transazioni, ticketMedio, scontoTotale, topClienti, byKind, byDay };
}

// ============================================
// getTeamHoursReport (Wave 4 — /reports/team)
// ============================================

export type TeamHoursRow = {
  staffId: string;
  nome: string;
  giorniFerie: number;
  oreLavorate: number;
};

export type TeamHoursReport = TeamHoursRow[];

export async function getTeamHoursReport(p: Periodo): Promise<TeamHoursReport> {
  return safeReportAction("getTeamHoursReport", () => _getTeamHoursReportInner(p), []);
}

async function _getTeamHoursReportInner(p: Periodo): Promise<TeamHoursReport> {
  const period = sanitizePeriodo(p);
  const supabase = createAdminClient();

  const [{ data: staffRows }, { data: ferieRows }, { data: presenzeRows }] = await Promise.all([
    supabase.from("staff").select("id, nome, cognome"),
    supabase
      .from("staff_ferie")
      .select("staff_id, data_inizio, data_fine, stato")
      .in("stato", ["approved", "pending"]),
    supabase
      .from("staff_presenze")
      .select("staff_id, clock_in, clock_out")
      .gte("data", period.from)
      .lte("data", period.to)
      .not("clock_out", "is", null),
  ]);

  const staffMap = new Map<string, { nome: string }>();
  for (const s of staffRows || []) {
    staffMap.set(String(s.id), {
      nome: `${s.nome ?? ""} ${s.cognome ?? ""}`.trim() || "—",
    });
  }

  // Count ferie days per staff overlapping with period
  const ferieAgg = new Map<string, number>();
  for (const f of ferieRows || []) {
    if (f.data_fine < period.from || f.data_inizio > period.to) continue;
    const sid = String(f.staff_id);
    const clampedStart = f.data_inizio > period.from ? f.data_inizio : period.from;
    const clampedEnd = f.data_fine < period.to ? f.data_fine : period.to;
    if (clampedStart > clampedEnd) continue;
    const ms =
      new Date(clampedEnd + "T00:00:00").getTime() -
      new Date(clampedStart + "T00:00:00").getTime();
    const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
    ferieAgg.set(sid, (ferieAgg.get(sid) ?? 0) + days);
  }

  // Sum ore lavorate per staff
  const oreAgg = new Map<string, number>();
  for (const pr of presenzeRows || []) {
    const sid = String(pr.staff_id);
    if (pr.clock_out) {
      const ms = new Date(pr.clock_out).getTime() - new Date(pr.clock_in).getTime();
      if (ms > 0) oreAgg.set(sid, (oreAgg.get(sid) ?? 0) + ms / (1000 * 60 * 60));
    }
  }

  const result: TeamHoursReport = Array.from(staffMap.entries())
    .filter(([sid]) => ferieAgg.has(sid) || oreAgg.has(sid))
    .map(([sid, info]) => ({
      staffId: sid,
      nome: info.nome,
      giorniFerie: ferieAgg.get(sid) ?? 0,
      oreLavorate: Math.round((oreAgg.get(sid) ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.oreLavorate - a.oreLavorate);

  return result;
}
