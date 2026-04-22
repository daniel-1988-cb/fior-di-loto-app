import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppuntamentiDomaniForReminders } from "@/lib/actions/reminders";
import {
  buildReminderJobs,
  renderWhatsAppReminderBody,
  type ReminderJob,
} from "@/lib/reminders/jobs";
import { sendEmail } from "@/lib/actions/send-email";
import { renderAppointmentReminder } from "@/lib/email/templates/appointment-reminder";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

export const runtime = "nodejs";
// 300s covers ~100 reminders with the default 2-4s jitter between WA sends.
// Bump higher if the salon ever scales past ~75 appts/day.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitterDelayMs(): number {
  const min = Number(process.env.WA_REMINDER_DELAY_MIN_MS ?? 2000);
  const max = Number(process.env.WA_REMINDER_DELAY_MAX_MS ?? 4000);
  const lo = Number.isFinite(min) && min > 0 ? min : 2000;
  const hi = Number.isFinite(max) && max > lo ? max : lo + 2000;
  return lo + Math.random() * (hi - lo);
}

type ChannelError = {
  appointmentId: string;
  channel: "wa" | "email" | "flag";
  error: string;
};

type RunSummary = {
  ok: true;
  candidates: number;
  sent_wa: number;
  sent_email: number;
  skipped_no_channel: number;
  errors: ChannelError[];
};

/**
 * Daily reminders cron — called by Vercel cron (Bearer CRON_SECRET).
 *
 * For every appointment happening tomorrow (stato confermato|completato,
 * reminder_sent_at IS NULL) we try to fire:
 *   - a WhatsApp message if wa_opt_in && telefono
 *   - a branded email if cliente.email
 * Each channel is attempted independently; a failure on one does not
 * block the other. After all attempts for a given appointment, we stamp
 * reminder_sent_at so a retry (manual or otherwise) doesn't duplicate.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await getAppuntamentiDomaniForReminders();
  const jobs = buildReminderJobs(rows);

  const summary: RunSummary = {
    ok: true,
    candidates: jobs.length,
    sent_wa: 0,
    sent_email: 0,
    skipped_no_channel: 0,
    errors: [],
  };

  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID ?? "";
  const accessToken = process.env.META_WA_ACCESS_TOKEN ?? "";
  const waConfigured = Boolean(phoneNumberId && accessToken);

  const supabase = createAdminClient();

  for (const job of jobs) {
    if (!job.wa && !job.email) {
      summary.skipped_no_channel += 1;
      await flagSent(supabase, job.appointmentId, summary);
      continue;
    }

    if (job.wa) {
      if (!waConfigured) {
        summary.errors.push({
          appointmentId: job.appointmentId,
          channel: "wa",
          error: "META_WA_* env vars not configured",
        });
      } else {
        try {
          await sendMessage(job.wa.phone, renderWhatsAppReminderBody(job), {
            phoneNumberId,
            accessToken,
          });
          summary.sent_wa += 1;
          // Throttle between WA sends to avoid Meta anti-spam heuristics on
          // bulk business-initiated conversations. Jittered 2–4s by default,
          // tuneable via WA_REMINDER_DELAY_MIN_MS / WA_REMINDER_DELAY_MAX_MS.
          await sleep(jitterDelayMs());
        } catch (e) {
          const msg = e instanceof Error ? e.message : "wa send failed";
          console.error(
            `[cron/reminders] wa failed for appt ${job.appointmentId}:`,
            msg,
          );
          summary.errors.push({
            appointmentId: job.appointmentId,
            channel: "wa",
            error: msg,
          });
        }
      }
    }

    if (job.email) {
      try {
        const tpl = renderAppointmentReminder({
          clientName: job.clientName,
          serviceName: job.serviceName,
          date: job.dateHuman,
          time: job.time,
        });
        const res = await sendEmail({
          to: job.email.to,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        });
        if (res.ok) {
          summary.sent_email += 1;
        } else {
          console.error(
            `[cron/reminders] email failed for appt ${job.appointmentId}:`,
            res.error,
          );
          summary.errors.push({
            appointmentId: job.appointmentId,
            channel: "email",
            error: res.error,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "email send failed";
        console.error(
          `[cron/reminders] email threw for appt ${job.appointmentId}:`,
          msg,
        );
        summary.errors.push({
          appointmentId: job.appointmentId,
          channel: "email",
          error: msg,
        });
      }
    }

    await flagSent(supabase, job.appointmentId, summary);
  }

  return NextResponse.json(summary, { status: 200 });
}

async function flagSent(
  supabase: ReturnType<typeof createAdminClient>,
  appointmentId: ReminderJob["appointmentId"],
  summary: RunSummary,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) {
    console.error(
      `[cron/reminders] failed to flag reminder_sent_at for ${appointmentId}:`,
      error.message,
    );
    summary.errors.push({
      appointmentId,
      channel: "flag",
      error: error.message,
    });
  }
}
