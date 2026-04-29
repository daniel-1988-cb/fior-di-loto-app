"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import {
  FOLLOWUP_OFFSETS,
  type FollowUpJob,
  type FollowUpRule,
} from "@/lib/types/service-followup";
import { renderFollowUpMessage, formatTimeRome } from "@/lib/reminders/followup-render";

// ============================================
// ROW TYPES
// ============================================

type RuleRow = {
  id: string;
  service_id: string | null;
  offset_hours: number;
  message_template: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

function rowToRule(row: RuleRow): FollowUpRule {
  return {
    id: row.id,
    serviceId: row.service_id,
    offsetHours: row.offset_hours,
    messageTemplate: row.message_template,
    attivo: row.attivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidOffset(n: number): boolean {
  return (
    Number.isInteger(n) &&
    n >= -168 &&
    n <= 168 &&
    n !== 0 &&
    n !== -24
  );
}

// ============================================
// READ
// ============================================

/**
 * Se serviceId è passato (non null), torna le regole di quel servizio + i
 * default globali. Se è null, torna solo i globali. Se non passato (undefined),
 * torna tutte le regole esistenti.
 */
export async function getFollowUpRules(
  serviceId?: string | null,
): Promise<FollowUpRule[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("service_followup_rules")
    .select("*")
    .order("service_id", { ascending: true, nullsFirst: true })
    .order("offset_hours", { ascending: true });

  if (serviceId === null) {
    query = query.is("service_id", null);
  } else if (typeof serviceId === "string") {
    if (!isValidUUID(serviceId)) return [];
    query = query.or(`service_id.eq.${serviceId},service_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => rowToRule(r as RuleRow));
}

/**
 * Torna le 3 regole globali (service_id IS NULL) per i 3 offset previsti.
 * Se non esiste una regola per un offset, ritorna un placeholder vuoto
 * (id="", attivo=false, template="") cosicché la UI possa mostrare 3 card.
 * Il placeholder NON viene scritto nel DB finché l'utente non salva.
 */
export async function getGlobalFollowUpDefaults(): Promise<FollowUpRule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_followup_rules")
    .select("*")
    .is("service_id", null);
  if (error) throw error;

  const existing = (data ?? []).map((r) => rowToRule(r as RuleRow));
  const byOffset = new Map(existing.map((r) => [r.offsetHours, r]));

  const now = new Date().toISOString();
  return FOLLOWUP_OFFSETS.map((offset) => {
    const e = byOffset.get(offset);
    if (e) return e;
    return {
      id: "",
      serviceId: null,
      offsetHours: offset,
      messageTemplate: "",
      attivo: false,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function getFollowUpRuleByServiceAndOffset(
  serviceId: string | null,
  offsetHours: number,
): Promise<FollowUpRule | null> {
  if (!isValidOffset(offsetHours)) return null;
  if (serviceId !== null && !isValidUUID(serviceId)) return null;

  const supabase = createAdminClient();
  let query = supabase
    .from("service_followup_rules")
    .select("*")
    .eq("offset_hours", offsetHours);
  if (serviceId === null) {
    query = query.is("service_id", null);
  } else {
    query = query.eq("service_id", serviceId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? rowToRule(data as RuleRow) : null;
}

// ============================================
// WRITE
// ============================================

export async function upsertFollowUpRule(input: {
  serviceId: string | null;
  offsetHours: number;
  messageTemplate: string;
  attivo: boolean;
}): Promise<{ ok: true; rule: FollowUpRule } | { ok: false; error: string }> {
  if (!isValidOffset(input.offsetHours)) {
    return { ok: false, error: "Offset non valido" };
  }
  if (input.serviceId !== null && !isValidUUID(input.serviceId)) {
    return { ok: false, error: "Service ID non valido" };
  }
  const template = truncate(
    sanitizeString(input.messageTemplate ?? ""),
    2000,
  );
  if (template.trim().length === 0) {
    return { ok: false, error: "Messaggio obbligatorio" };
  }

  const supabase = createAdminClient();
  // Manual upsert su (service_id, offset_hours): cerca, poi update o insert.
  // Non uso `.upsert()` perché Supabase richiede onConflict con un constraint
  // name e qui usiamo UNIQUE (service_id, offset_hours) — più solido così.
  let lookup = supabase
    .from("service_followup_rules")
    .select("id")
    .eq("offset_hours", input.offsetHours);
  if (input.serviceId === null) {
    lookup = lookup.is("service_id", null);
  } else {
    lookup = lookup.eq("service_id", input.serviceId);
  }
  const { data: existing, error: lookupErr } = await lookup.maybeSingle();
  if (lookupErr) return { ok: false, error: lookupErr.message };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("service_followup_rules")
      .update({
        message_template: template,
        attivo: input.attivo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, rule: rowToRule(data as RuleRow) };
  }

  const { data, error } = await supabase
    .from("service_followup_rules")
    .insert({
      service_id: input.serviceId,
      offset_hours: input.offsetHours,
      message_template: template,
      attivo: input.attivo,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, rule: rowToRule(data as RuleRow) };
}

export async function deleteFollowUpRule(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("service_followup_rules")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// DUE FOLLOWUPS QUERY (used by cron)
// ============================================

type AppointmentRow = {
  id: string;
  data: string;
  ora_inizio: string;
  client_id: string;
  service_id: string | null;
  stato: string;
  clients: {
    nome: string | null;
    cognome: string | null;
    telefono: string | null;
    wa_opt_in: boolean | null;
  } | null;
  services: { nome: string | null } | null;
};

/**
 * Combina data (YYYY-MM-DD) e ora (HH:MM[:SS]) come ISO Europe/Rome (offset +02:00 estate / +01:00 inverno).
 * Per semplicità usiamo l'offset dedotto dalla data (DST: 2026 → marzo 29 / ottobre 25).
 *
 * Trade-off: usiamo `Date.parse(\`${data}T${ora}\`)` come Europe/Rome via toLocaleString
 * trick. Vedi MDN: serializziamo con offset corretto per il momento.
 */
function buildApptDateRome(data: string, ora: string): Date {
  const time = ora.length === 5 ? `${ora}:00` : ora; // pad seconds
  // Europe/Rome è UTC+1 d'inverno e UTC+2 d'estate. Gestiamo un'approssimazione
  // robusta: parsiamo come UTC, poi correggiamo via Intl.
  // Approccio: costruisci un Date partendo da una stringa "YYYY-MM-DDTHH:MM:SS"
  // interpretata localmente sul server (UTC su Vercel), poi shift via offset
  // calcolato per Europe/Rome.
  const naive = new Date(`${data}T${time}Z`); // UTC
  // Trova offset Rome a quella data (in minuti rispetto a UTC):
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(naive);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const romeUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  // diff = quanto Rome è avanti rispetto a UTC (ms)
  const diff = romeUtcMs - naive.getTime();
  // Se "naive" è interpretato come ora locale Rome, l'istante UTC reale è naive - diff.
  return new Date(naive.getTime() - diff);
}

/**
 * Trova tutti gli (appointment, rule) pronti da inviare ora.
 *
 * Strategia (in JS, evita SQL custom per portabilità):
 *  1. Carica tutte le regole attive
 *  2. Per ogni regola raccogli appointments con data tra (now - offset - 30min)
 *     e (now - offset + 30min). Filtra stato in confermato|completato.
 *  3. Per gli appuntamenti con servizio specifico, override default globali
 *     (se esiste regola per service_id specifico per quell'offset, ignora la globale)
 *  4. Esclude i (appt, rule) già presenti in appointment_followups_sent
 *  5. Filtra wa_opt_in TRUE e telefono valorizzato
 *
 * Ritorna FollowUpJob pronti per l'invio.
 */
export async function getDueFollowUps(now: Date): Promise<FollowUpJob[]> {
  const supabase = createAdminClient();

  // 1. Carica tutte le regole attive
  const { data: rulesData, error: rulesErr } = await supabase
    .from("service_followup_rules")
    .select("*")
    .eq("attivo", true);
  if (rulesErr) {
    console.error("[followups] rules query error:", rulesErr);
    return [];
  }
  const rules = (rulesData ?? []).map((r) => rowToRule(r as RuleRow));
  if (rules.length === 0) return [];

  const WINDOW_MIN = 30; // ±30 minuti dalla finestra di trigger

  // Calcoliamo l'intervallo MASSIMO di "now - offset" per minimizzare il
  // range di appointments da scaricare. Se offset = -12 → appt = now + 12h.
  // Se offset = +24 → appt = now - 24h.
  const targetTimes = rules.map((r) => {
    const center = new Date(now.getTime() - r.offsetHours * 3600 * 1000);
    return {
      rule: r,
      windowStart: new Date(center.getTime() - WINDOW_MIN * 60 * 1000),
      windowEnd: new Date(center.getTime() + WINDOW_MIN * 60 * 1000),
    };
  });

  const minDate = new Date(Math.min(...targetTimes.map((t) => t.windowStart.getTime())));
  const maxDate = new Date(Math.max(...targetTimes.map((t) => t.windowEnd.getTime())));

  // 2. Carica appointments nel range (data sola, poi filtreremo per ora_inizio combinato)
  const dataFrom = minDate.toISOString().slice(0, 10);
  // +1 day di buffer: una finestra di 30min può sforare il giorno
  const buffer = new Date(maxDate.getTime() + 24 * 3600 * 1000);
  const dataTo = buffer.toISOString().slice(0, 10);

  const { data: apptsData, error: apptsErr } = await supabase
    .from("appointments")
    .select(
      "id, data, ora_inizio, client_id, service_id, stato, clients(nome, cognome, telefono, wa_opt_in), services(nome)",
    )
    .gte("data", dataFrom)
    .lte("data", dataTo)
    .in("stato", ["confermato", "completato"]);
  if (apptsErr) {
    console.error("[followups] appointments query error:", apptsErr);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- appointments join returns clients/services as nested objects; AppointmentRow normalises the shape
  const appts = (apptsData ?? []) as unknown as AppointmentRow[];
  if (appts.length === 0) return [];

  // 3. Per ogni appointment determina la regola applicabile per ogni offset:
  //    se esiste rule per (service_id = appt.service_id, offset) → quella
  //    altrimenti se esiste rule globale (service_id NULL, offset) → quella
  const candidates: Array<{
    appt: AppointmentRow;
    rule: FollowUpRule;
    apptDate: Date;
  }> = [];

  // Indicizza regole: per ogni offset, separa per-service (Map<serviceId, rule>) e global rule.
  const rulesByOffset = new Map<
    number,
    { byService: Map<string, FollowUpRule>; global: FollowUpRule | null }
  >();
  for (const r of rules) {
    let entry = rulesByOffset.get(r.offsetHours);
    if (!entry) {
      entry = { byService: new Map(), global: null };
      rulesByOffset.set(r.offsetHours, entry);
    }
    if (r.serviceId === null) {
      entry.global = r;
    } else {
      entry.byService.set(r.serviceId, r);
    }
  }

  for (const appt of appts) {
    const apptDate = buildApptDateRome(appt.data, appt.ora_inizio);
    if (Number.isNaN(apptDate.getTime())) continue;

    for (const [offset, entry] of rulesByOffset.entries()) {
      // Trigger time: appt + offset
      const trigger = new Date(apptDate.getTime() + offset * 3600 * 1000);
      const diffMin = Math.abs(trigger.getTime() - now.getTime()) / 60000;
      if (diffMin > WINDOW_MIN) continue;

      // Resolve rule: per-service override globale
      const rule =
        (appt.service_id && entry.byService.get(appt.service_id)) ||
        entry.global;
      if (!rule) continue;

      candidates.push({ appt, rule, apptDate });
    }
  }

  if (candidates.length === 0) return [];

  // 4. Carica le righe già inviate per (appointment_id, rule_id)
  const apptIds = Array.from(new Set(candidates.map((c) => c.appt.id)));
  const { data: sentData, error: sentErr } = await supabase
    .from("appointment_followups_sent")
    .select("appointment_id, rule_id")
    .in("appointment_id", apptIds);
  if (sentErr) {
    console.error("[followups] sent query error:", sentErr);
    return [];
  }
  const sentSet = new Set(
    (sentData ?? []).map((r: { appointment_id: string; rule_id: string }) => `${r.appointment_id}::${r.rule_id}`),
  );

  // 5. Filtra wa_opt_in + phone + dedup
  const jobs: FollowUpJob[] = [];
  for (const { appt, rule, apptDate } of candidates) {
    const key = `${appt.id}::${rule.id}`;
    if (sentSet.has(key)) continue;

    const phone = appt.clients?.telefono ?? null;
    const optIn = Boolean(appt.clients?.wa_opt_in);
    if (!phone || !optIn) continue;

    const fullName = `${appt.clients?.nome ?? ""} ${appt.clients?.cognome ?? ""}`.trim();
    const firstName = fullName.split(" ")[0] || fullName || "cliente";
    const serviceName = appt.services?.nome || "il trattamento";

    const message = renderFollowUpMessage(rule.messageTemplate, {
      firstName,
      serviceName,
      appointmentDateTime: apptDate,
      now,
    });

    jobs.push({
      appointmentId: appt.id,
      ruleId: rule.id,
      clientId: appt.client_id,
      clientName: fullName || "cliente",
      clientPhone: phone,
      waOptIn: optIn,
      serviceName,
      appointmentDateTime: apptDate.toISOString(),
      message,
      offsetHours: rule.offsetHours,
      firstName,
      appointmentTime: formatTimeRome(apptDate),
    });
  }

  return jobs;
}
