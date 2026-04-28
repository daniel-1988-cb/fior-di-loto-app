"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import { isAdmin, getCurrentUser } from "@/lib/actions/ai-assistant";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000002";
const VALID_TIPI = ["guadagnati", "riscattati", "aggiustamento", "bonus", "scaduti"] as const;
type TipoTransazione = (typeof VALID_TIPI)[number];
const VALID_CATEGORIE = ["sconto", "prodotto", "servizio", "esperienza", "regalo"] as const;
type CategoriaPremio = (typeof VALID_CATEGORIE)[number];
const VALID_TIERS = ["base", "silver", "gold", "vip"] as const;
type Tier = (typeof VALID_TIERS)[number];

// ─── Types (erased at compile time, safe to export from "use server") ────────

export type LoyaltySettings = {
  id: string;
  attivo: boolean;
  euro_per_punto: number;
  soglia_silver: number;
  soglia_gold: number;
  soglia_vip: number;
  punti_compleanno: number;
  punti_referral: number;
  scadenza_punti_giorni: number | null;
  updated_at: string | null;
};

export type LoyaltyReward = {
  id: string;
  nome: string;
  descrizione: string | null;
  costo_punti: number;
  categoria: string;
  immagine_url: string | null;
  attivo: boolean;
  scadenza_giorni: number | null;
  created_at: string;
};

export type LoyaltyTransaction = {
  id: string;
  client_id: string | null;
  tipo: string;
  punti: number;
  descrizione: string | null;
  appointment_id: string | null;
  reward_id: string | null;
  saldo_dopo: number | null;
  created_by_email: string | null;
  created_at: string;
};

// ─── Helpers (internal) ──────────────────────────────────────────────────────

function tierFromPoints(
  punti: number,
  settings: Pick<LoyaltySettings, "soglia_silver" | "soglia_gold" | "soglia_vip">
): Tier {
  const p = Number(punti) || 0;
  if (p >= Number(settings.soglia_vip)) return "vip";
  if (p >= Number(settings.soglia_gold)) return "gold";
  if (p >= Number(settings.soglia_silver)) return "silver";
  return "base";
}

async function loadSettingsOrThrow(): Promise<LoyaltySettings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Impostazioni fedeltà non configurate");
  return data as LoyaltySettings;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getLoyaltySettings(): Promise<LoyaltySettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  return (data as LoyaltySettings) ?? null;
}

export async function updateLoyaltySettings(data: {
  attivo?: boolean;
  euro_per_punto?: number;
  soglia_silver?: number;
  soglia_gold?: number;
  soglia_vip?: number;
  punti_compleanno?: number;
  punti_referral?: number;
  scadenza_punti_giorni?: number | null;
}) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof data.attivo === "boolean") updates.attivo = data.attivo;
  if (typeof data.euro_per_punto === "number" && data.euro_per_punto > 0) {
    updates.euro_per_punto = data.euro_per_punto;
  }
  if (typeof data.soglia_silver === "number" && data.soglia_silver >= 0) {
    updates.soglia_silver = Math.floor(data.soglia_silver);
  }
  if (typeof data.soglia_gold === "number" && data.soglia_gold >= 0) {
    updates.soglia_gold = Math.floor(data.soglia_gold);
  }
  if (typeof data.soglia_vip === "number" && data.soglia_vip >= 0) {
    updates.soglia_vip = Math.floor(data.soglia_vip);
  }
  if (typeof data.punti_compleanno === "number" && data.punti_compleanno >= 0) {
    updates.punti_compleanno = Math.floor(data.punti_compleanno);
  }
  if (typeof data.punti_referral === "number" && data.punti_referral >= 0) {
    updates.punti_referral = Math.floor(data.punti_referral);
  }
  if (data.scadenza_punti_giorni === null) {
    updates.scadenza_punti_giorni = null;
  } else if (
    typeof data.scadenza_punti_giorni === "number" &&
    data.scadenza_punti_giorni > 0
  ) {
    updates.scadenza_punti_giorni = Math.floor(data.scadenza_punti_giorni);
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("loyalty_settings")
    .update(updates)
    .eq("id", SETTINGS_ID)
    .select()
    .single();
  if (error) throw error;
  return row as LoyaltySettings;
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export async function getRewards(activeOnly = false): Promise<LoyaltyReward[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("loyalty_rewards")
    .select("*")
    .order("costo_punti", { ascending: true });
  if (activeOnly) query = query.eq("attivo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as LoyaltyReward[]) || [];
}

export async function createReward(data: {
  nome: string;
  descrizione?: string;
  costo_punti: number;
  categoria: string;
  scadenza_giorni?: number | null;
  attivo?: boolean;
  immagine_url?: string | null;
}) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  if (!data.nome?.trim()) throw new Error("Nome obbligatorio");
  if (!Number.isFinite(data.costo_punti) || data.costo_punti <= 0) {
    throw new Error("Costo punti deve essere maggiore di zero");
  }
  const categoria: CategoriaPremio = (
    VALID_CATEGORIE as readonly string[]
  ).includes(data.categoria)
    ? (data.categoria as CategoriaPremio)
    : "sconto";

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      nome: truncate(sanitizeString(data.nome), 200),
      descrizione: data.descrizione
        ? truncate(sanitizeString(data.descrizione), 1000)
        : null,
      costo_punti: Math.floor(data.costo_punti),
      categoria,
      attivo: data.attivo ?? true,
      scadenza_giorni:
        typeof data.scadenza_giorni === "number" && data.scadenza_giorni > 0
          ? Math.floor(data.scadenza_giorni)
          : null,
      immagine_url: data.immagine_url || null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as LoyaltyReward;
}

export async function updateReward(
  id: string,
  data: {
    nome?: string;
    descrizione?: string | null;
    costo_punti?: number;
    categoria?: string;
    scadenza_giorni?: number | null;
    attivo?: boolean;
    immagine_url?: string | null;
  }
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const updates: Record<string, unknown> = {};
  if (typeof data.nome === "string" && data.nome.trim()) {
    updates.nome = truncate(sanitizeString(data.nome), 200);
  }
  if (data.descrizione !== undefined) {
    updates.descrizione = data.descrizione
      ? truncate(sanitizeString(data.descrizione), 1000)
      : null;
  }
  if (typeof data.costo_punti === "number" && data.costo_punti > 0) {
    updates.costo_punti = Math.floor(data.costo_punti);
  }
  if (
    typeof data.categoria === "string" &&
    (VALID_CATEGORIE as readonly string[]).includes(data.categoria)
  ) {
    updates.categoria = data.categoria;
  }
  if (data.scadenza_giorni === null) {
    updates.scadenza_giorni = null;
  } else if (
    typeof data.scadenza_giorni === "number" &&
    data.scadenza_giorni > 0
  ) {
    updates.scadenza_giorni = Math.floor(data.scadenza_giorni);
  }
  if (typeof data.attivo === "boolean") updates.attivo = data.attivo;
  if (data.immagine_url !== undefined) updates.immagine_url = data.immagine_url || null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("loyalty_rewards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as LoyaltyReward;
}

export async function deleteReward(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  const { error } = await supabase.from("loyalty_rewards").delete().eq("id", id);
  if (error) throw error;
}

// ─── Client points & transactions ────────────────────────────────────────────

export async function getClientPoints(clientId: string) {
  if (!isValidUUID(clientId)) {
    return { punti: 0, tier: "base" as Tier, transactions: [] as LoyaltyTransaction[] };
  }
  const supabase = createAdminClient();
  const [clientRes, txRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, punti, tier")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (clientRes.error) throw clientRes.error;
  if (txRes.error) throw txRes.error;
  return {
    punti: Number(clientRes.data?.punti) || 0,
    tier: (clientRes.data?.tier as Tier) || "base",
    transactions: (txRes.data as LoyaltyTransaction[]) || [],
  };
}

/**
 * Storico transazioni loyalty di un singolo cliente, ordinato dalla più
 * recente. Usato dal tab "Programma fedeltà" del profilo cliente.
 */
export async function getClientLoyaltyTransactions(
  clientId: string,
  limit = 50
): Promise<LoyaltyTransaction[]> {
  if (!isValidUUID(clientId)) return [];
  const safeLimit = Math.max(1, Math.min(200, limit));
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    console.error("[loyalty] getClientLoyaltyTransactions error:", error);
    return [];
  }
  return (data as LoyaltyTransaction[]) || [];
}

async function applyPointsDelta(
  clientId: string,
  delta: number,
  tipo: TipoTransazione,
  opts: {
    descrizione?: string | null;
    appointment_id?: string | null;
    reward_id?: string | null;
  } = {}
) {
  if (!isValidUUID(clientId)) throw new Error("ID cliente non valido");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Punti non validi");
  if (!(VALID_TIPI as readonly string[]).includes(tipo)) {
    throw new Error("Tipo transazione non valido");
  }

  const supabase = createAdminClient();
  const settings = await loadSettingsOrThrow();
  const intDelta = Math.floor(delta);

  // Atomic update via RPC: evita race condition read-modify-write su clients.punti.
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "apply_loyalty_points_atomic",
    {
      p_client_id: clientId,
      p_delta: intDelta,
    },
  );
  if (rpcErr) {
    // RPC throws "Punti insufficienti..." o "Cliente non trovato..."
    throw new Error(rpcErr.message);
  }
  const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const next = Number(rpcRow?.punti_after ?? 0);

  // Aggiorna tier separatamente (calcolato in app, non race-critical perché
  // dipende solo dal saldo già finalizzato dall'RPC atomico).
  const newTier = tierFromPoints(next, settings);
  const user = await getCurrentUser();

  const { error: tierErr } = await supabase
    .from("clients")
    .update({ tier: newTier })
    .eq("id", clientId);
  if (tierErr) {
    // Compensa: revert punti per non lasciare lo stato inconsistente
    await supabase.rpc("apply_loyalty_points_atomic", {
      p_client_id: clientId,
      p_delta: -intDelta,
    });
    throw tierErr;
  }

  const { data: tx, error: txErr } = await supabase
    .from("loyalty_transactions")
    .insert({
      client_id: clientId,
      tipo,
      punti: intDelta,
      descrizione: opts.descrizione
        ? truncate(sanitizeString(opts.descrizione), 500)
        : null,
      appointment_id: opts.appointment_id || null,
      reward_id: opts.reward_id || null,
      saldo_dopo: next,
      created_by_email: user?.email || "system",
    })
    .select()
    .single();
  if (txErr) {
    // Compensa: i punti sono già stati aggiornati ma il log audit fallisce.
    // Reverte i punti per mantenere lo stato consistente con il log.
    await supabase.rpc("apply_loyalty_points_atomic", {
      p_client_id: clientId,
      p_delta: -intDelta,
    });
    throw txErr;
  }

  return { punti: next, tier: newTier, transaction: tx as LoyaltyTransaction };
}

export async function addPointsManual(
  clientId: string,
  punti: number,
  descrizione: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");
  return applyPointsDelta(clientId, Math.floor(punti), "aggiustamento", {
    descrizione,
  });
}

export async function redeemReward(clientId: string, rewardId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");
  if (!isValidUUID(clientId)) throw new Error("ID cliente non valido");
  if (!isValidUUID(rewardId)) throw new Error("ID premio non valido");

  const supabase = createAdminClient();
  const { data: reward, error: rErr } = await supabase
    .from("loyalty_rewards")
    .select("id, nome, costo_punti, attivo")
    .eq("id", rewardId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!reward) throw new Error("Premio non trovato");
  if (!reward.attivo) throw new Error("Premio non disponibile");

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .select("punti")
    .eq("id", clientId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!client) throw new Error("Cliente non trovato");
  if ((Number(client.punti) || 0) < Number(reward.costo_punti)) {
    throw new Error("Punti insufficienti");
  }

  const result = await applyPointsDelta(
    clientId,
    -Math.floor(Number(reward.costo_punti)),
    "riscattati",
    {
      descrizione: `Riscatto: ${reward.nome}`,
      reward_id: rewardId,
    }
  );
  return { punti: result.punti, tier: result.tier };
}

export async function awardPointsForAppointment(appointmentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autenticato");
  if (!isValidUUID(appointmentId)) throw new Error("ID appuntamento non valido");

  const supabase = createAdminClient();
  const settings = await loadSettingsOrThrow();
  if (!settings.attivo) {
    throw new Error("Programma fedeltà disattivato");
  }
  const eurPerPunto = Number(settings.euro_per_punto) || 0;
  if (eurPerPunto <= 0) throw new Error("Configurazione euro_per_punto non valida");

  const { data: appt, error: aErr } = await supabase
    .from("appointments")
    .select("id, client_id, services(prezzo)")
    .eq("id", appointmentId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!appt) throw new Error("Appuntamento non trovato");
  if (!appt.client_id) throw new Error("Appuntamento senza cliente");

  const service = Array.isArray(appt.services) ? appt.services[0] : appt.services;
  const prezzo = Number(service?.prezzo) || 0;
  if (prezzo <= 0) throw new Error("Servizio senza prezzo");

  const punti = Math.floor(prezzo / eurPerPunto);
  if (punti <= 0) {
    return { punti: 0, awarded: 0 };
  }

  const result = await applyPointsDelta(appt.client_id, punti, "guadagnati", {
    descrizione: `Visita del ${new Date().toLocaleDateString("it-IT")} (${prezzo.toFixed(
      2
    )} €)`,
    appointment_id: appointmentId,
  });
  return { punti: result.punti, awarded: punti };
}

// ─── Aggregated reads (dashboard) ────────────────────────────────────────────

export async function getTopLoyalClients(limit = 10) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, nome, cognome, punti, tier, totale_visite")
    .gt("punti", 0)
    .order("punti", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  if (error) throw error;
  return data || [];
}

export async function getTierDistribution() {
  const supabase = createAdminClient();
  const counts: Record<Tier, number> = { base: 0, silver: 0, gold: 0, vip: 0 };
  await Promise.all(
    (VALID_TIERS as readonly Tier[]).map(async (t) => {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("tier", t);
      if (error) throw error;
      counts[t] = count || 0;
    })
  );
  return counts;
}

export async function getRecentRedemptions(limit = 10) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select(
      "id, punti, descrizione, created_at, client_id, reward_id, clients(nome, cognome), loyalty_rewards(nome, categoria)"
    )
    .eq("tipo", "riscattati")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  if (error) throw error;
  return data || [];
}

export async function getRecentTransactions(limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select(
      "id, tipo, punti, descrizione, created_at, saldo_dopo, created_by_email, client_id, reward_id, clients(nome, cognome), loyalty_rewards(nome)"
    )
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, limit)));
  if (error) throw error;
  return data || [];
}

export async function getActiveMembersCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .gt("punti", 0);
  if (error) throw error;
  return count || 0;
}

export async function getTotalPointsIssued(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("punti")
    .eq("tipo", "guadagnati");
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + (Number(r.punti) || 0), 0);
}
