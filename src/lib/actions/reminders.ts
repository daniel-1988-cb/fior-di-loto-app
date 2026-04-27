"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppuntamentoDomaniReminder } from "@/lib/reminders/jobs";

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
    .select("id, ora_inizio, clients(nome, cognome, telefono), services(nome), staff(nome)")
    .eq("data", dataStr)
    .neq("stato", "cancellato")
    .order("ora_inizio", { ascending: true });

  if (error) {
    console.error("[reminders] getAppuntamentiDomani query error:", error);
    return [];
  }
  if (!data) return [];

  type ReminderRow = {
    id: string;
    ora_inizio: string | null;
    clients?: { nome?: string | null; cognome?: string | null; telefono?: string | null } | null;
    services?: { nome?: string | null } | null;
    staff?: { nome?: string | null } | null;
  };
  return (data as ReminderRow[]).map((a) => ({
    id: a.id,
    ora: a.ora_inizio ? String(a.ora_inizio).slice(0, 5) : "",
    cliente_nome: a.clients?.nome || "",
    cliente_cognome: a.clients?.cognome || "",
    cliente_telefono: a.clients?.telefono || null,
    servizio_nome: a.services?.nome || "",
    operatrice: a.staff?.nome || null,
  }));
}

/**
 * Return tomorrow's active appointments (by local Europe/Rome day) enriched
 * with the data needed to send WhatsApp + email reminders. Uses the admin
 * client (service-role key) so it bypasses RLS — callers must authenticate.
 *
 * "Tomorrow" is computed against the server's wall clock. Vercel runs in UTC
 * — that's fine for our 17:00 Europe/Rome cron (which fires at 15:00 UTC),
 * because "tomorrow" relative to 15:00 UTC on day D is still day D+1 in Rome.
 *
 * Pure-helper companions (buildReminderJobs, renderWhatsAppReminderBody) live
 * in `@/lib/reminders/jobs` because this module is "use server" and can only
 * export async functions.
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

  type ReminderForJobRow = {
    id: string;
    data: string;
    ora_inizio: string | null;
    reminder_sent_at: string | null;
    clients?: { id?: string | null; nome?: string | null; cognome?: string | null; telefono?: string | null; email?: string | null; wa_opt_in?: boolean | null } | null;
    services?: { nome?: string | null } | null;
  };
  return (data as ReminderForJobRow[]).map((a) => ({
    id: a.id,
    data: a.data ?? "",
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
