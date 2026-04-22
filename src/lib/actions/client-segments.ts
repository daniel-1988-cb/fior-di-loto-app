"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidSegmento } from "@/lib/security/validate";

/**
 * Segmento auto-classification + bulk updates.
 *
 * Valid segmento values (per `isValidSegmento`): lead | nuova | lotina | inattiva | vip
 *
 * Classification rules (applied in order, first match wins):
 *   1. VIP     — visite_ytd >= 12 OR totale_ytd >= 1500
 *   2. inattiva — ultima_visita olderThan 90 days
 *   3. lead    — ultima_visita IS NULL AND created_at < now - 30d (prospect che non ha mai preso appuntamento)
 *   4. lotina  — visite_ytd >= 1 (regolare)
 *   5. nuova   — fallback (nuova entry, ancora in fase di onboarding)
 */

const VALID_SEGMENTS = ["lead", "nuova", "lotina", "inattiva", "vip"] as const;
type Segmento = (typeof VALID_SEGMENTS)[number];

const VIP_VISITE_YTD = 12;
const VIP_SPESO_YTD = 1500;
const INATTIVA_GIORNI = 90;
const LEAD_CREATED_GIORNI = 30;

const DAY_MS = 86_400_000;

export type SegmentStats = {
  total: number;
  counts: Record<Segmento, number>;
  percents: Record<Segmento, number>;
};

/**
 * Aggregate how many clients sit in each segmento today.
 * Returns raw counts and percentages (0-100, one decimal).
 */
export async function getSegmentStats(): Promise<SegmentStats> {
  const supabase = createAdminClient();
  const counts: Record<Segmento, number> = {
    lead: 0,
    nuova: 0,
    lotina: 0,
    inattiva: 0,
    vip: 0,
  };

  await Promise.all(
    VALID_SEGMENTS.map(async (seg) => {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("segmento", seg);
      if (error) throw error;
      counts[seg] = count || 0;
    })
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const percents = Object.fromEntries(
    VALID_SEGMENTS.map((seg) => [
      seg,
      total > 0 ? Math.round((counts[seg] / total) * 1000) / 10 : 0,
    ])
  ) as Record<Segmento, number>;

  return { total, counts, percents };
}

/**
 * Update segmento for a list of clients at once.
 * Silently skips invalid UUIDs / invalid segmento.
 */
export async function bulkUpdateSegmento(
  clientIds: string[],
  segmento: string
): Promise<{ updated: number; skipped: number; errors: string[] }> {
  if (!isValidSegmento(segmento)) {
    return { updated: 0, skipped: clientIds.length, errors: ["Segmento non valido"] };
  }
  const validIds = clientIds.filter(isValidUUID);
  const skipped = clientIds.length - validIds.length;
  if (validIds.length === 0) {
    return { updated: 0, skipped, errors: skipped > 0 ? ["Nessun ID valido"] : [] };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ segmento, updated_at: new Date().toISOString() })
    .in("id", validIds)
    .select("id");
  if (error) {
    return { updated: 0, skipped, errors: [error.message] };
  }
  return { updated: (data || []).length, skipped, errors: [] };
}

type ClientRow = {
  id: string;
  segmento: string | null;
  ultima_visita: string | null;
  created_at: string;
};

type AppointmentRow = {
  client_id: string;
};

type TransactionRow = {
  client_id: string | null;
  importo: number | null;
};

function classifySegmento(args: {
  ultima_visita: string | null;
  created_at: string;
  visite_ytd: number;
  totale_ytd: number;
  now: Date;
}): Segmento {
  const { ultima_visita, created_at, visite_ytd, totale_ytd, now } = args;

  if (visite_ytd >= VIP_VISITE_YTD || totale_ytd >= VIP_SPESO_YTD) {
    return "vip";
  }

  if (ultima_visita) {
    const lastMs = new Date(ultima_visita).getTime();
    const daysSince = (now.getTime() - lastMs) / DAY_MS;
    if (daysSince > INATTIVA_GIORNI) return "inattiva";
  }

  if (!ultima_visita) {
    const createdMs = new Date(created_at).getTime();
    const daysSinceCreated = (now.getTime() - createdMs) / DAY_MS;
    if (daysSinceCreated > LEAD_CREATED_GIORNI) return "lead";
  }

  if (visite_ytd >= 1) return "lotina";
  return "nuova";
}

/**
 * Walk every client, compute the segmento from real activity, and write it
 * back only when it would change. Safe to re-run (idempotent).
 *
 * Counts year-to-date visite (appointments with stato='completato') and
 * spesa (transactions tipo='entrata') for the current calendar year.
 */
export async function autoClassifyClients(): Promise<{
  classified: number;
  changed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const errors: string[] = [];

  const { data: clientsData, error: clientsErr } = await supabase
    .from("clients")
    .select("id, segmento, ultima_visita, created_at");
  if (clientsErr) {
    return { classified: 0, changed: 0, errors: [clientsErr.message] };
  }
  const clients = (clientsData || []) as ClientRow[];

  const { data: apptData, error: apptErr } = await supabase
    .from("appointments")
    .select("client_id")
    .eq("stato", "completato")
    .gte("data", yearStart.slice(0, 10));
  if (apptErr) errors.push(`appointments: ${apptErr.message}`);
  const appts = (apptData || []) as AppointmentRow[];

  const { data: txData, error: txErr } = await supabase
    .from("transactions")
    .select("client_id, importo")
    .eq("tipo", "entrata")
    .gte("data", yearStart.slice(0, 10));
  if (txErr) errors.push(`transactions: ${txErr.message}`);
  const txs = (txData || []) as TransactionRow[];

  // Index YTD visite + spesa per cliente.
  const visiteYtd = new Map<string, number>();
  for (const a of appts) {
    if (!a.client_id) continue;
    visiteYtd.set(a.client_id, (visiteYtd.get(a.client_id) || 0) + 1);
  }
  const totaleYtd = new Map<string, number>();
  for (const t of txs) {
    if (!t.client_id) continue;
    totaleYtd.set(
      t.client_id,
      (totaleYtd.get(t.client_id) || 0) + (Number(t.importo) || 0)
    );
  }

  // Group clients by target segmento and update in batch.
  const buckets: Record<Segmento, string[]> = {
    lead: [],
    nuova: [],
    lotina: [],
    inattiva: [],
    vip: [],
  };

  let classified = 0;
  for (const c of clients) {
    classified += 1;
    const target = classifySegmento({
      ultima_visita: c.ultima_visita,
      created_at: c.created_at,
      visite_ytd: visiteYtd.get(c.id) || 0,
      totale_ytd: totaleYtd.get(c.id) || 0,
      now,
    });
    if ((c.segmento || "") !== target) {
      buckets[target].push(c.id);
    }
  }

  let changed = 0;
  for (const seg of VALID_SEGMENTS) {
    const ids = buckets[seg];
    if (ids.length === 0) continue;
    const { data, error } = await supabase
      .from("clients")
      .update({ segmento: seg, updated_at: new Date().toISOString() })
      .in("id", ids)
      .select("id");
    if (error) {
      errors.push(`update ${seg}: ${error.message}`);
      continue;
    }
    changed += (data || []).length;
  }

  return { classified, changed, errors };
}
