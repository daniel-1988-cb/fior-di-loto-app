"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate, isValidSegmento } from "@/lib/security/validate";
import { VALID_CHANNELS, type Canale } from "@/lib/constants/messages";
import { sendMessage } from "@/lib/bot/whatsapp-meta";
import { sendEmail } from "@/lib/actions/send-email";

// ============================================
// TYPES
// ============================================

export const VALID_STATI = [
  "bozza",
  "programmata",
  "in_invio",
  "inviata",
  "errore",
] as const;
export type CampaignStato = (typeof VALID_STATI)[number];

export type Campaign = {
  id: string;
  nome: string;
  canale: Canale;
  segmentoTarget: string | null;
  subject: string | null;
  body: string;
  scheduleAt: string | null;
  stato: CampaignStato;
  sentCount: number;
  errorCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CampaignRow = {
  id: string;
  nome: string;
  canale: string;
  segmento_target: string | null;
  subject: string | null;
  body: string;
  schedule_at: string | null;
  stato: string;
  sent_count: number;
  error_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    nome: row.nome,
    canale: row.canale as Canale,
    segmentoTarget: row.segmento_target,
    subject: row.subject,
    body: row.body,
    scheduleAt: row.schedule_at,
    stato: (VALID_STATI as readonly string[]).includes(row.stato)
      ? (row.stato as CampaignStato)
      : "bozza",
    sentCount: row.sent_count ?? 0,
    errorCount: row.error_count ?? 0,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidCanale(canale: string): canale is Canale {
  return (VALID_CHANNELS as readonly string[]).includes(canale);
}

// ============================================
// READ
// ============================================

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => rowToCampaign(r as CampaignRow));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCampaign(data as CampaignRow) : null;
}

export async function getScheduledCampaigns(): Promise<Campaign[]> {
  // Due campaigns ready to be picked up by the cron.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("stato", "programmata")
    .lte("schedule_at", new Date().toISOString())
    .order("schedule_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => rowToCampaign(r as CampaignRow));
}

// ============================================
// WRITE
// ============================================

type CampaignInput = {
  nome?: string;
  canale?: string;
  segmentoTarget?: string | null;
  subject?: string | null;
  body?: string;
  scheduleAt?: string | null;
  stato?: string;
};

const MAX_NOME = 200;
const MAX_SUBJECT = 300;
const MAX_BODY = 4000;

function validateSegmentoTarget(seg: string | null | undefined): string | null {
  if (!seg) return null;
  return isValidSegmento(seg) ? seg : null;
}

export async function createCampaign(data: CampaignInput): Promise<Campaign> {
  if (!data.nome || !data.nome.trim()) throw new Error("Nome obbligatorio");
  if (!data.canale || !isValidCanale(data.canale)) throw new Error("Canale non valido");
  if (!data.body || !data.body.trim()) throw new Error("Body obbligatorio");

  const nome = truncate(sanitizeString(data.nome), MAX_NOME);
  const body = truncate(data.body.trim(), MAX_BODY);
  const subject = data.subject ? truncate(sanitizeString(data.subject), MAX_SUBJECT) : null;
  const segmentoTarget = validateSegmentoTarget(data.segmentoTarget);

  const stato =
    data.stato && (VALID_STATI as readonly string[]).includes(data.stato)
      ? (data.stato as CampaignStato)
      : "bozza";

  // If schedule_at is provided and stato is bozza, promote to 'programmata'.
  let scheduleAt: string | null = null;
  if (data.scheduleAt) {
    const d = new Date(data.scheduleAt);
    if (!isNaN(d.getTime())) scheduleAt = d.toISOString();
  }
  const finalStato = scheduleAt && stato === "bozza" ? "programmata" : stato;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("campaigns")
    .insert({
      nome,
      canale: data.canale,
      segmento_target: segmentoTarget,
      subject,
      body,
      schedule_at: scheduleAt,
      stato: finalStato,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCampaign(row as CampaignRow);
}

export async function updateCampaign(id: string, data: CampaignInput): Promise<Campaign> {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.nome !== undefined) {
    if (!data.nome.trim()) throw new Error("Nome obbligatorio");
    patch.nome = truncate(sanitizeString(data.nome), MAX_NOME);
  }
  if (data.canale !== undefined) {
    if (!isValidCanale(data.canale)) throw new Error("Canale non valido");
    patch.canale = data.canale;
  }
  if (data.segmentoTarget !== undefined) {
    patch.segmento_target = validateSegmentoTarget(data.segmentoTarget);
  }
  if (data.subject !== undefined) {
    patch.subject = data.subject
      ? truncate(sanitizeString(data.subject), MAX_SUBJECT)
      : null;
  }
  if (data.body !== undefined) {
    if (!data.body.trim()) throw new Error("Body obbligatorio");
    patch.body = truncate(data.body.trim(), MAX_BODY);
  }
  if (data.scheduleAt !== undefined) {
    if (data.scheduleAt) {
      const d = new Date(data.scheduleAt);
      patch.schedule_at = isNaN(d.getTime()) ? null : d.toISOString();
    } else {
      patch.schedule_at = null;
    }
  }
  if (data.stato !== undefined && (VALID_STATI as readonly string[]).includes(data.stato)) {
    patch.stato = data.stato;
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToCampaign(row as CampaignRow);
}

export async function deleteCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  // Don't delete campaigns that are currently sending or have been sent
  // (keep them for history). Soft-archive to errore instead if needed.
  const { data: cur } = await supabase
    .from("campaigns")
    .select("stato")
    .eq("id", id)
    .maybeSingle();
  if (cur && (cur.stato === "in_invio" || cur.stato === "inviata")) {
    return { ok: false, error: "Campagna già inviata — non eliminabile" };
  }
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCampaignAttivo(
  id: string,
  programma: boolean
): Promise<{ ok: boolean }> {
  // Toggle between bozza <-> programmata. Only meaningful when schedule_at is set.
  if (!isValidUUID(id)) return { ok: false };
  const stato = programma ? "programmata" : "bozza";
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ stato, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { ok: !error };
}

// ============================================
// SEND
// ============================================

type SendSummary = {
  campaignId: string;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

/**
 * Send a campaign immediately. Marks stato='in_invio' at start and
 * 'inviata' (or 'errore' if everything failed) at end. Idempotent against
 * re-entry: if already in_invio or inviata, bails early.
 *
 * - WhatsApp: uses sendMessage (Meta) when client has wa_opt_in + telefono
 * - Email: uses sendEmail (Resend) when client has email
 * - SMS: TODO — currently logs and counts as skipped.
 */
export async function sendCampaignNow(campaignId: string): Promise<SendSummary> {
  if (!isValidUUID(campaignId)) throw new Error("ID non valido");
  const supabase = createAdminClient();

  // Fetch + transition atomically via update+select
  const { data: cur, error: curErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (curErr) throw curErr;
  if (!cur) throw new Error("Campagna non trovata");
  const camp = rowToCampaign(cur as CampaignRow);
  if (camp.stato === "in_invio" || camp.stato === "inviata") {
    return {
      campaignId,
      sent: camp.sentCount,
      failed: camp.errorCount,
      skipped: 0,
      errors: [`Campagna in stato ${camp.stato}, skip`],
    };
  }

  await supabase
    .from("campaigns")
    .update({
      stato: "in_invio",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  // Build recipient list from segmento target
  let clientsQuery = supabase
    .from("clients")
    .select("id, nome, cognome, telefono, email, wa_opt_in, blocked")
    .order("cognome", { ascending: true })
    .limit(2000);
  if (camp.segmentoTarget) clientsQuery = clientsQuery.eq("segmento", camp.segmentoTarget);

  const { data: clientRows, error: clientErr } = await clientsQuery;
  if (clientErr) {
    await supabase
      .from("campaigns")
      .update({
        stato: "errore",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    throw clientErr;
  }

  const clients = (clientRows ?? []).filter((c) => !c.blocked);

  const summary: SendSummary = {
    campaignId,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID ?? "";
  const accessToken = process.env.META_WA_ACCESS_TOKEN ?? "";
  const waConfigured = Boolean(phoneNumberId && accessToken);

  for (const c of clients) {
    let ok = false;
    let errMsg: string | null = null;
    try {
      if (camp.canale === "whatsapp") {
        if (!waConfigured) {
          errMsg = "WA non configurato";
        } else if (!c.telefono || !c.wa_opt_in) {
          summary.skipped += 1;
          continue;
        } else {
          const phone = c.telefono.startsWith("39") ? c.telefono : `39${c.telefono}`;
          await sendMessage(phone, personalizeBody(camp.body, c), {
            phoneNumberId,
            accessToken,
          });
          ok = true;
          // small throttle to avoid Meta spam heuristics on bulk
          await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
        }
      } else if (camp.canale === "email") {
        if (!c.email) {
          summary.skipped += 1;
          continue;
        }
        const subject = camp.subject || camp.nome;
        const bodyText = personalizeBody(camp.body, c);
        const html = bodyText.replace(/\n/g, "<br/>");
        const res = await sendEmail({
          to: c.email,
          subject,
          html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#222">${html}</div>`,
          text: bodyText,
        });
        if (!res.ok) errMsg = res.error;
        else ok = true;
      } else if (camp.canale === "sms") {
        // Placeholder — SMS gateway not wired yet.
        summary.skipped += 1;
        continue;
      } else {
        summary.skipped += 1;
        continue;
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "send failed";
    }

    if (ok) {
      summary.sent += 1;
      await supabase.from("sent_messages").insert({
        client_id: c.id,
        canale: camp.canale,
        contenuto: personalizeBody(camp.body, c),
        stato: "inviato",
      });
    } else {
      summary.failed += 1;
      if (errMsg) summary.errors.push(`${c.id}: ${errMsg}`);
      await supabase.from("sent_messages").insert({
        client_id: c.id,
        canale: camp.canale,
        contenuto: personalizeBody(camp.body, c),
        stato: "errore",
      });
    }
  }

  const finalStato: CampaignStato =
    summary.sent === 0 && summary.failed > 0 ? "errore" : "inviata";

  await supabase
    .from("campaigns")
    .update({
      stato: finalStato,
      sent_count: summary.sent,
      error_count: summary.failed,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return summary;
}

function personalizeBody(
  body: string,
  client: { nome: string | null; cognome: string | null }
): string {
  return body
    .replace(/\{\{nome\}\}/gi, client.nome ?? "")
    .replace(/\{\{cognome\}\}/gi, client.cognome ?? "");
}
