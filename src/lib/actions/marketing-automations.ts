"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import { VALID_CHANNELS, type Canale } from "@/lib/constants/messages";
import {
  VALID_TRIGGERS,
  type TriggerTipo,
  type TriggerConfig,
} from "@/lib/constants/marketing-automations";
import { sendMessage } from "@/lib/bot/whatsapp-meta";
import { sendEmail } from "@/lib/actions/send-email";

// ============================================
// TYPES
// ============================================

export type Automation = {
  id: string;
  nome: string;
  triggerTipo: TriggerTipo;
  triggerConfig: TriggerConfig;
  canale: Canale;
  body: string;
  attivo: boolean;
  ultimaEsecuzione: string | null;
  createdAt: string;
  updatedAt: string;
};

type AutomationRow = {
  id: string;
  nome: string;
  trigger_tipo: string;
  trigger_config: unknown;
  canale: string;
  body: string;
  attivo: boolean;
  ultima_esecuzione: string | null;
  created_at: string;
  updated_at: string;
};

function rowToAutomation(row: AutomationRow): Automation {
  const tipo = (VALID_TRIGGERS as readonly string[]).includes(row.trigger_tipo)
    ? (row.trigger_tipo as TriggerTipo)
    : "inattivita_giorni";
  const cfg =
    row.trigger_config && typeof row.trigger_config === "object"
      ? (row.trigger_config as TriggerConfig)
      : {};
  return {
    id: row.id,
    nome: row.nome,
    triggerTipo: tipo,
    triggerConfig: cfg,
    canale: row.canale as Canale,
    body: row.body,
    attivo: row.attivo,
    ultimaEsecuzione: row.ultima_esecuzione,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidCanale(canale: string): canale is Canale {
  return (VALID_CHANNELS as readonly string[]).includes(canale);
}

function isValidTrigger(t: string): t is TriggerTipo {
  return (VALID_TRIGGERS as readonly string[]).includes(t);
}

// ============================================
// READ
// ============================================

export async function getAutomations(): Promise<Automation[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("marketing_automations")
    .select("*")
    .order("attivo", { ascending: false })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToAutomation(r as AutomationRow));
}

export async function getAutomation(id: string): Promise<Automation | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("marketing_automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAutomation(data as AutomationRow) : null;
}

// ============================================
// WRITE
// ============================================

type AutomationInput = {
  nome?: string;
  triggerTipo?: string;
  triggerConfig?: TriggerConfig;
  canale?: string;
  body?: string;
  attivo?: boolean;
};

const MAX_NOME = 200;
const MAX_BODY = 4000;

function sanitizeTriggerConfig(cfg: TriggerConfig | undefined): TriggerConfig {
  if (!cfg || typeof cfg !== "object") return {};
  const out: TriggerConfig = {};
  if (typeof cfg.giorni === "number" && Number.isInteger(cfg.giorni) && cfg.giorni > 0) {
    out.giorni = Math.min(cfg.giorni, 3650);
  }
  return out;
}

export async function createAutomation(data: AutomationInput): Promise<Automation> {
  if (!data.nome?.trim()) throw new Error("Nome obbligatorio");
  if (!data.triggerTipo || !isValidTrigger(data.triggerTipo))
    throw new Error("Trigger non valido");
  if (!data.canale || !isValidCanale(data.canale)) throw new Error("Canale non valido");
  if (!data.body?.trim()) throw new Error("Body obbligatorio");

  const nome = truncate(sanitizeString(data.nome), MAX_NOME);
  const body = truncate(data.body.trim(), MAX_BODY);
  const cfg = sanitizeTriggerConfig(data.triggerConfig);

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("marketing_automations")
    .insert({
      nome,
      trigger_tipo: data.triggerTipo,
      trigger_config: cfg,
      canale: data.canale,
      body,
      attivo: data.attivo ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToAutomation(row as AutomationRow);
}

export async function updateAutomation(
  id: string,
  data: AutomationInput
): Promise<Automation> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.nome !== undefined) {
    if (!data.nome.trim()) throw new Error("Nome obbligatorio");
    patch.nome = truncate(sanitizeString(data.nome), MAX_NOME);
  }
  if (data.triggerTipo !== undefined) {
    if (!isValidTrigger(data.triggerTipo)) throw new Error("Trigger non valido");
    patch.trigger_tipo = data.triggerTipo;
  }
  if (data.triggerConfig !== undefined) {
    patch.trigger_config = sanitizeTriggerConfig(data.triggerConfig);
  }
  if (data.canale !== undefined) {
    if (!isValidCanale(data.canale)) throw new Error("Canale non valido");
    patch.canale = data.canale;
  }
  if (data.body !== undefined) {
    if (!data.body.trim()) throw new Error("Body obbligatorio");
    patch.body = truncate(data.body.trim(), MAX_BODY);
  }
  if (data.attivo !== undefined) patch.attivo = !!data.attivo;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("marketing_automations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToAutomation(row as AutomationRow);
}

export async function deleteAutomation(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("marketing_automations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleAutomationAttivo(
  id: string,
  attivo: boolean
): Promise<{ ok: boolean }> {
  if (!isValidUUID(id)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("marketing_automations")
    .update({ attivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { ok: !error };
}

// ============================================
// RUNNER (called by cron)
// ============================================

type RunResult = {
  automationId: string;
  nome: string;
  matched: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Runs every active automation once. Per-client dedup: we skip if the
 * client has already received a message with the same `canale` and the
 * same `contenuto` in the last 24h. That keeps the cron idempotent
 * across retries without needing a dedicated log column.
 */
export async function runAutomations(): Promise<{
  totalRuns: number;
  results: RunResult[];
}> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("marketing_automations")
    .select("*")
    .eq("attivo", true);
  if (error) throw error;

  const automations = (rows ?? []).map((r) => rowToAutomation(r as AutomationRow));

  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID ?? "";
  const accessToken = process.env.META_WA_ACCESS_TOKEN ?? "";
  const waConfigured = Boolean(phoneNumberId && accessToken);

  const results: RunResult[] = [];
  for (const auto of automations) {
    const clients = await selectClientsForAutomation(auto);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const c of clients) {
      // dedup: same canale + contenuto within last 24h for this client
      const personalized = personalizeBody(auto.body, c);
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("sent_messages")
        .select("id")
        .eq("client_id", c.id)
        .eq("canale", auto.canale)
        .eq("contenuto", personalized)
        .gte("inviato_at", since)
        .limit(1);
      if ((recent ?? []).length > 0) {
        skipped += 1;
        continue;
      }

      let ok = false;
      let errMsg: string | null = null;
      try {
        if (auto.canale === "whatsapp") {
          if (!waConfigured || !c.telefono || !c.wa_opt_in) {
            skipped += 1;
            continue;
          }
          const phone = c.telefono.startsWith("39") ? c.telefono : `39${c.telefono}`;
          await sendMessage(phone, personalized, { phoneNumberId, accessToken });
          ok = true;
          await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
        } else if (auto.canale === "email") {
          if (!c.email) {
            skipped += 1;
            continue;
          }
          const html = personalized.replace(/\n/g, "<br/>");
          const res = await sendEmail({
            to: c.email,
            subject: auto.nome,
            html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#222">${html}</div>`,
            text: personalized,
          });
          ok = res.ok;
          if (!res.ok) errMsg = res.error;
        } else {
          // sms not yet wired
          skipped += 1;
          continue;
        }
      } catch (e) {
        errMsg = e instanceof Error ? e.message : "send failed";
      }

      await supabase.from("sent_messages").insert({
        client_id: c.id,
        canale: auto.canale,
        contenuto: personalized,
        stato: ok ? "inviato" : "errore",
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        if (errMsg) console.error(`[automations] ${auto.nome} → ${c.id}: ${errMsg}`);
      }
    }

    await supabase
      .from("marketing_automations")
      .update({ ultima_esecuzione: new Date().toISOString() })
      .eq("id", auto.id);

    results.push({
      automationId: auto.id,
      nome: auto.nome,
      matched: clients.length,
      sent,
      failed,
      skipped,
    });
  }

  return { totalRuns: automations.length, results };
}

type CandidateClient = {
  id: string;
  nome: string | null;
  cognome: string | null;
  telefono: string | null;
  email: string | null;
  wa_opt_in: boolean | null;
};

async function selectClientsForAutomation(auto: Automation): Promise<CandidateClient[]> {
  const supabase = createAdminClient();
  const today = new Date();
  const giorni = auto.triggerConfig.giorni ?? 60;

  switch (auto.triggerTipo) {
    case "inattivita_giorni": {
      const cutoff = new Date(today.getTime() - giorni * 86400 * 1000).toISOString();
      const { data } = await supabase
        .from("clients")
        .select("id, nome, cognome, telefono, email, wa_opt_in")
        .lte("ultima_visita", cutoff)
        .eq("blocked", false)
        .limit(500);
      return (data ?? []) as CandidateClient[];
    }
    case "nuovo_cliente": {
      // clienti creati negli ultimi `giorni` giorni (default 7) che non hanno
      // ancora mai avuto una visita completata
      const days = auto.triggerConfig.giorni ?? 7;
      const since = new Date(today.getTime() - days * 86400 * 1000).toISOString();
      const { data } = await supabase
        .from("clients")
        .select("id, nome, cognome, telefono, email, wa_opt_in")
        .gte("created_at", since)
        .is("ultima_visita", null)
        .eq("blocked", false)
        .limit(500);
      return (data ?? []) as CandidateClient[];
    }
    case "compleanno": {
      // match MM-DD del data_nascita contro oggi
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const { data } = await supabase
        .from("clients")
        .select("id, nome, cognome, telefono, email, wa_opt_in, data_nascita")
        .not("data_nascita", "is", null)
        .eq("blocked", false)
        .limit(1000);
      return (data ?? [])
        .filter((c) => {
          if (!c.data_nascita) return false;
          const [, m, d] = String(c.data_nascita).split("-");
          return m === mm && d === dd;
        })
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          cognome: c.cognome,
          telefono: c.telefono,
          email: c.email,
          wa_opt_in: c.wa_opt_in,
        })) as CandidateClient[];
    }
    case "post_visita": {
      // clienti la cui ultima_visita è esattamente `giorni` giorni fa (±12h)
      const d = auto.triggerConfig.giorni ?? 2;
      const target = today.getTime() - d * 86400 * 1000;
      const lo = new Date(target - 12 * 3600 * 1000).toISOString();
      const hi = new Date(target + 12 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("clients")
        .select("id, nome, cognome, telefono, email, wa_opt_in")
        .gte("ultima_visita", lo)
        .lte("ultima_visita", hi)
        .eq("blocked", false)
        .limit(500);
      return (data ?? []) as CandidateClient[];
    }
    default:
      return [];
  }
}

function personalizeBody(
  body: string,
  client: { nome: string | null; cognome: string | null }
): string {
  return body
    .replace(/\{\{nome\}\}/gi, client.nome ?? "")
    .replace(/\{\{cognome\}\}/gi, client.cognome ?? "");
}
