"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type DayData = {
  giorno: string; // "Lun", "Mar", ecc.
  data: string;   // "YYYY-MM-DD"
  vendite: number;
  appuntamenti: number;
};

export async function getDashboardChartData(): Promise<DayData[]> {
  const supabase = createAdminClient();

  // Last 7 days
  const days: DayData[] = [];
  const shortDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      giorno: shortDays[d.getDay()],
      data: dateStr,
      vendite: 0,
      appuntamenti: 0,
    });
  }

  const from = days[0].data;
  const to = days[days.length - 1].data;

  const [{ data: txRows }, { data: aptRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("data, importo")
      .eq("tipo", "entrata")
      .gte("data", from)
      .lte("data", to),
    supabase
      .from("appointments")
      .select("data, stato")
      .gte("data", from)
      .lte("data", to)
      .neq("stato", "cancellato"),
  ]);

  for (const tx of txRows || []) {
    const day = days.find((d) => d.data === tx.data);
    if (day) day.vendite += Number(tx.importo || 0);
  }
  for (const apt of aptRows || []) {
    const dateStr = String(apt.data).slice(0, 10);
    const day = days.find((d) => d.data === dateStr);
    if (day) day.appuntamenti += 1;
  }

  return days;
}

// ============================================
// NEW KPI FUNCTIONS
// ============================================

export type FatturatoOggiResult = {
  oggi: number;
  ieri: number;
  trend: number; // percentuale rispetto a ieri
};

export async function getFatturatoOggi(): Promise<FatturatoOggiResult> {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const ieri = new Date(now);
    ieri.setDate(now.getDate() - 1);
    const ieriStr = ieri.toISOString().slice(0, 10);

    const [{ data: oggiRows }, { data: ieriRows }] = await Promise.all([
      supabase.from("transactions").select("importo").eq("tipo", "entrata").eq("data", todayStr),
      supabase.from("transactions").select("importo").eq("tipo", "entrata").eq("data", ieriStr),
    ]);

    const oggi = (oggiRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);
    const ieriTot = (ieriRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);

    let trend = 0;
    if (ieriTot > 0) {
      trend = Math.round(((oggi - ieriTot) / ieriTot) * 100);
    } else if (oggi > 0) {
      trend = 100;
    }

    return { oggi, ieri: ieriTot, trend };
  } catch {
    return { oggi: 0, ieri: 0, trend: 0 };
  }
}

export type AppuntamentiOggiResult = {
  totali: number;
  completati: number;
  noShow: number;
  cancellati: number;
  prossimo: { ora: string; cliente: string; servizio: string } | null;
};

export async function getAppuntamentiOggi(): Promise<AppuntamentiOggiResult> {
  try {
    const supabase = createAdminClient();
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

    const { data: rows } = await supabase
      .from("appointments")
      .select("stato, ora_inizio, clients(nome, cognome), services(nome)")
      .eq("data", todayStr)
      .order("ora_inizio", { ascending: true });

    const all = rows || [];
    const totali = all.length;
    const completati = all.filter((r) => r.stato === "completato").length;
    const noShow = all.filter((r) => r.stato === "no_show").length;
    const cancellati = all.filter((r) => r.stato === "cancellato").length;

    // Prossimo appuntamento: il primo con stato "confermato" dopo l'ora attuale
    const prossimo = all.find((r) => {
      const oraStr = String(r.ora_inizio || "").slice(0, 5);
      return r.stato === "confermato" && oraStr >= nowTime;
    });

    let prossimoData: AppuntamentiOggiResult["prossimo"] = null;
    if (prossimo) {
      const clienteRaw = prossimo.clients as { nome?: string; cognome?: string } | null;
      const servizioRaw = prossimo.services as { nome?: string } | null;
      prossimoData = {
        ora: String(prossimo.ora_inizio || "").slice(0, 5),
        cliente: clienteRaw ? `${clienteRaw.nome || ""} ${clienteRaw.cognome || ""}`.trim() : "—",
        servizio: servizioRaw?.nome || "—",
      };
    }

    return { totali, completati, noShow, cancellati, prossimo: prossimoData };
  } catch {
    return { totali: 0, completati: 0, noShow: 0, cancellati: 0, prossimo: null };
  }
}

export type ClienteCompleanno = {
  id: string;
  nome: string;
  cognome: string;
  data_nascita: string;
  telefono: string | null;
};

export type CompeanniResult = {
  oggi: ClienteCompleanno[];
  prossimi7giorni: ClienteCompleanno[];
};

export async function getCompleanni(): Promise<CompeanniResult> {
  try {
    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("clients")
      .select("id, nome, cognome, data_nascita, telefono")
      .not("data_nascita", "is", null);

    const now = new Date();
    const oggi: ClienteCompleanno[] = [];
    const prossimi7giorni: ClienteCompleanno[] = [];

    for (const row of rows || []) {
      if (!row.data_nascita) continue;
      const bDate = new Date(row.data_nascita + "T00:00:00");
      const bMese = bDate.getMonth();
      const bGiorno = bDate.getDate();

      // Check today
      if (bMese === now.getMonth() && bGiorno === now.getDate()) {
        oggi.push({
          id: row.id as string,
          nome: row.nome as string,
          cognome: row.cognome as string,
          data_nascita: row.data_nascita as string,
          telefono: (row.telefono as string) || null,
        });
        continue;
      }

      // Check next 7 days (days 1-7 from now)
      for (let offset = 1; offset <= 7; offset++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        if (bMese === checkDate.getMonth() && bGiorno === checkDate.getDate()) {
          prossimi7giorni.push({
            id: row.id as string,
            nome: row.nome as string,
            cognome: row.cognome as string,
            data_nascita: row.data_nascita as string,
            telefono: (row.telefono as string) || null,
          });
          break;
        }
      }
    }

    // Sort prossimi7giorni by upcoming date
    prossimi7giorni.sort((a, b) => {
      const dA = new Date(a.data_nascita + "T00:00:00");
      const dB = new Date(b.data_nascita + "T00:00:00");
      const mA = dA.getMonth() * 100 + dA.getDate();
      const mB = dB.getMonth() * 100 + dB.getDate();
      return mA - mB;
    });

    return { oggi, prossimi7giorni };
  } catch {
    return { oggi: [], prossimi7giorni: [] };
  }
}

export type TopServizioItem = {
  nome: string;
  categoria: string;
  count: number;
  fatturato: number;
};

export async function getTopServizi(): Promise<TopServizioItem[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const inizioMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const fineMese = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

    // Get completed appointments this month with service info
    const { data: rows } = await supabase
      .from("appointments")
      .select("services(id, nome, categoria, prezzo)")
      .eq("stato", "completato")
      .gte("data", inizioMese)
      .lt("data", fineMese);

    if (!rows || rows.length === 0) return [];

    // Aggregate by service
    const map = new Map<string, TopServizioItem>();
    for (const row of rows) {
      const s = row.services as { id?: string; nome?: string; categoria?: string; prezzo?: number } | null;
      if (!s?.id) continue;
      const key = s.id;
      if (!map.has(key)) {
        map.set(key, {
          nome: s.nome || "—",
          categoria: s.categoria || "—",
          count: 0,
          fatturato: 0,
        });
      }
      const entry = map.get(key)!;
      entry.count += 1;
      entry.fatturato += Number(s.prezzo || 0);
    }

    // Sort by fatturato desc, take top 5
    return Array.from(map.values())
      .sort((a, b) => b.fatturato - a.fatturato)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export type StaffPerformanceItem = {
  id: string;
  nome: string;
  cognome: string;
  colore: string;
  appuntamentiMese: number;
  fatturato: number;
  obiettivo: number;
  percentuale: number;
};

export async function getStaffPerformance(): Promise<StaffPerformanceItem[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const inizioMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const fineMese = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

    const [{ data: staffRows }, { data: aptRows }] = await Promise.all([
      supabase.from("staff").select("id, nome, cognome, colore, obiettivo_mensile").eq("attiva", true),
      supabase
        .from("appointments")
        .select("staff_id, services(prezzo)")
        .eq("stato", "completato")
        .gte("data", inizioMese)
        .lt("data", fineMese)
        .not("staff_id", "is", null),
    ]);

    if (!staffRows || staffRows.length === 0) return [];

    // Build a map of staff_id -> { count, fatturato }
    const perfMap = new Map<string, { count: number; fatturato: number }>();
    for (const apt of aptRows || []) {
      const sid = apt.staff_id as string;
      if (!sid) continue;
      if (!perfMap.has(sid)) perfMap.set(sid, { count: 0, fatturato: 0 });
      const entry = perfMap.get(sid)!;
      entry.count += 1;
      const s = apt.services as { prezzo?: number } | null;
      entry.fatturato += Number(s?.prezzo || 0);
    }

    return staffRows.map((s) => {
      const perf = perfMap.get(s.id as string) || { count: 0, fatturato: 0 };
      const obiettivo = Number(s.obiettivo_mensile || 0);
      const percentuale = obiettivo > 0 ? Math.min(Math.round((perf.fatturato / obiettivo) * 100), 100) : 0;
      return {
        id: s.id as string,
        nome: s.nome as string,
        cognome: (s.cognome as string) || "",
        colore: (s.colore as string) || "#e8a4a4",
        appuntamentiMese: perf.count,
        fatturato: perf.fatturato,
        obiettivo,
        percentuale,
      };
    });
  } catch {
    return [];
  }
}

// ============================================
// CLIENTI A RISCHIO (non vengono da 60+ giorni)
// ============================================

export type ClienteARischio = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  ultima_visita: string | null;
  giorni_assenza: number;
  segmento: string;
};

export async function getClientiARischio(giorniSoglia = 60): Promise<ClienteARischio[]> {
  try {
    const supabase = createAdminClient();
    const soglia = new Date();
    soglia.setDate(soglia.getDate() - giorniSoglia);
    const sogliaStr = soglia.toISOString().slice(0, 10);

    const { data: rows } = await supabase
      .from("clients")
      .select("id, nome, cognome, telefono, ultima_visita, segmento")
      .not("ultima_visita", "is", null)
      .lte("ultima_visita", sogliaStr)
      .neq("segmento", "lead")
      .order("ultima_visita", { ascending: true })
      .limit(10);

    const today = new Date();
    return (rows || []).map((r) => {
      const lastVisit = new Date(String(r.ultima_visita) + "T00:00:00");
      const giorni = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: r.id as string,
        nome: r.nome as string,
        cognome: r.cognome as string,
        telefono: (r.telefono as string) || null,
        ultima_visita: r.ultima_visita as string,
        giorni_assenza: giorni,
        segmento: (r.segmento as string) || "—",
      };
    });
  } catch {
    return [];
  }
}

// ============================================
// PRODOTTI SCORTE BASSE
// ============================================

export type ProdottoScortaBassa = {
  id: string;
  nome: string;
  categoria: string;
  giacenza: number;
  soglia_alert: number;
};

export async function getProdottiScorteBasse(): Promise<ProdottoScortaBassa[]> {
  try {
    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("products")
      .select("id, nome, categoria, giacenza, soglia_alert")
      .eq("attivo", true)
      .order("giacenza", { ascending: true })
      .limit(20);

    return (rows || [])
      .filter((r) => Number(r.giacenza) <= Number(r.soglia_alert ?? 5))
      .map((r) => ({
        id: r.id as string,
        nome: r.nome as string,
        categoria: r.categoria as string,
        giacenza: Number(r.giacenza),
        soglia_alert: Number(r.soglia_alert ?? 5),
      }));
  } catch {
    return [];
  }
}
