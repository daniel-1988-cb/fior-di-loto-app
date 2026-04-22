"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AppuntamentoDomani = {
  id: string;
  ora: string; // "HH:MM"
  cliente_nome: string;
  cliente_cognome: string;
  cliente_telefono: string | null;
  servizio_nome: string;
  operatrice: string | null;
};

export async function getAppuntamentiDomani(): Promise<AppuntamentoDomani[]> {
  const supabase = createAdminClient();

  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  const dataStr = domani.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select("id, ora, clients(nome, cognome, telefono), services(nome), staff(nome)")
    .eq("data", dataStr)
    .neq("stato", "cancellato")
    .order("ora", { ascending: true });

  if (error || !data) return [];

  return data.map((a: any) => ({
    id: a.id,
    ora: a.ora ? String(a.ora).slice(0, 5) : "",
    cliente_nome: a.clients?.nome || "",
    cliente_cognome: a.clients?.cognome || "",
    cliente_telefono: a.clients?.telefono || null,
    servizio_nome: a.services?.nome || "",
    operatrice: a.staff?.nome || null,
  }));
}

// ============================================================
// Reminder cron helpers
// ============================================================
// Extended view of a tomorrow appointment that also carries the
// channels we can reach the client on (email + WhatsApp opt-in).
// Used by /api/cron/reminders — NOT a drop-in replacement for
// AppuntamentoDomani above (that one feeds UI widgets).

export type AppuntamentoDomaniReminder = {
  id: string;
  data: string; // "YYYY-MM-DD"
  ora: string; // "HH:MM"
  cliente_id: string;
  cliente_nome: string;
  cliente_cognome: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  wa_opt_in: boolean;
  servizio_nome: string;
  reminder_sent_at: string | null;
};

/**
 * Return tomorrow's active appointments (by local Europe/Rome day) enriched
 * with the data needed to send WhatsApp + email reminders. Uses the admin
 * client (service-role key) so it bypasses RLS — callers must authenticate.
 *
 * "Tomorrow" is computed against the server's wall clock. Vercel runs in UTC
 * — that's fine for our 17:00 Europe/Rome cron (which fires at 15:00 UTC),
 * because "tomorrow" relative to 15:00 UTC on day D is still day D+1 in Rome.
 */
export async function getAppuntamentiDomaniForReminders(): Promise<
  AppuntamentoDomaniReminder[]
> {
  const supabase = createAdminClient();

  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  const dataStr = domani.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, data, ora_inizio, reminder_sent_at, clients(id, nome, cognome, telefono, email, wa_opt_in), services(nome)",
    )
    .eq("data", dataStr)
    .in("stato", ["confermato", "completato"])
    .is("reminder_sent_at", null)
    .order("ora_inizio", { ascending: true });

  if (error) {
    console.error("[reminders] query error:", error);
    return [];
  }
  if (!data) return [];

  return data.map((a: any) => ({
    id: a.id,
    data: a.data,
    ora: a.ora_inizio ? String(a.ora_inizio).slice(0, 5) : "",
    cliente_id: a.clients?.id || "",
    cliente_nome: a.clients?.nome || "",
    cliente_cognome: a.clients?.cognome || "",
    cliente_telefono: a.clients?.telefono || null,
    cliente_email: a.clients?.email || null,
    wa_opt_in: Boolean(a.clients?.wa_opt_in),
    servizio_nome: a.services?.nome || "",
    reminder_sent_at: a.reminder_sent_at ?? null,
  }));
}

export type ReminderJob = {
  appointmentId: string;
  clientId: string;
  clientName: string; // "Nome Cognome" (trimmed)
  serviceName: string;
  dateHuman: string; // "venerdì 23 aprile 2026"
  dateIso: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  wa: { phone: string } | null;
  email: { to: string } | null;
};

/**
 * Pure planner — turns a row set into the WA+email send jobs the cron will
 * execute. Keeps the route handler thin and makes this testable without
 * mocking Supabase.
 *
 * Rules:
 *  - WA enqueued only if wa_opt_in = true AND telefono present.
 *  - Email enqueued only if cliente_email present.
 *  - A row with neither channel is silently skipped (still flagged as sent
 *    so we don't retry every cron tick — caller decides).
 */
export function buildReminderJobs(
  rows: AppuntamentoDomaniReminder[],
  opts?: { locale?: string; timeZone?: string },
): ReminderJob[] {
  const locale = opts?.locale ?? "it-IT";
  const timeZone = opts?.timeZone ?? "Europe/Rome";
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });

  return rows.map((r) => {
    const fullName = `${r.cliente_nome} ${r.cliente_cognome}`.trim();
    const dateHuman = (() => {
      // r.data is "YYYY-MM-DD"; anchor to noon UTC to avoid TZ flip
      const d = new Date(`${r.data}T12:00:00Z`);
      return fmt.format(d);
    })();
    const wa =
      r.wa_opt_in && r.cliente_telefono
        ? { phone: r.cliente_telefono }
        : null;
    const email = r.cliente_email ? { to: r.cliente_email } : null;
    return {
      appointmentId: r.id,
      clientId: r.cliente_id,
      clientName: fullName || "cliente",
      serviceName: r.servizio_nome || "appuntamento",
      dateHuman,
      dateIso: r.data,
      time: r.ora,
      wa,
      email,
    };
  });
}

/**
 * Build the short WhatsApp reminder body. Kept here so it is unit-testable
 * and consistent across cron + any future manual "resend" action.
 */
export function renderWhatsAppReminderBody(job: ReminderJob): string {
  return [
    `Ciao ${job.clientName}, ti ricordiamo il tuo appuntamento di domani:`,
    `${job.dateHuman} alle ${job.time} — ${job.serviceName}.`,
    `Ti aspettiamo da Fior di Loto!`,
  ].join("\n");
}
