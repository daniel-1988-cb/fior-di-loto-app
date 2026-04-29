// Pure helpers for the daily reminder cron. Kept out of
// `src/lib/actions/reminders.ts` because that module is marked
// "use server" — every export there must be an async function.
// These helpers are synchronous and are unit-tested in
// src/app/api/cron/__tests__/reminders.test.ts.

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
 * Turn a row set from getAppuntamentiDomaniForReminders() into the WA + email
 * send jobs the cron will execute.
 *
 * Rules:
 *  - WA enqueued only if wa_opt_in = true AND telefono present.
 *  - Email enqueued only if cliente_email present.
 *  - A row with neither channel becomes a zero-channel job; the caller is
 *    responsible for flagging it as sent so we don't retry every cron tick.
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
      r.wa_opt_in && r.cliente_telefono ? { phone: r.cliente_telefono } : null;
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
 * Short 3-line WhatsApp reminder body. Kept here so it is unit-testable
 * and reusable if we later expose a manual "resend" action. Uses only
 * the first name (before the first space) to keep the message warm and
 * avoid "Mario Rossi" formality on WhatsApp.
 */
export function renderWhatsAppReminderBody(job: ReminderJob): string {
  const firstName = job.clientName.split(" ")[0] || job.clientName;
  return [
    `Ciao ${firstName} 🪷 ti ricordo che domani ti aspetto per ${job.serviceName}:`,
    `${job.dateHuman} alle ${job.time}.`,
    `A presto!`,
  ].join("\n");
}
