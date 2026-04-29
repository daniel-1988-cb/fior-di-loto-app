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
import { sendMessage, sendTemplate } from "@/lib/bot/whatsapp-meta";
import {
  templateForDayBeforeReminder,
  isTemplatesEnabled,
} from "@/lib/bot/wa-templates";
import { hasActiveWASession } from "@/lib/bot/wa-session";
import { sendPushToAll } from "@/lib/actions/push";

export const runtime = "nodejs";
// 300s covers ~100 reminders with the default 2-4s jitter between WA sends.
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
 * Daily reminders cron — Bearer CRON_SECRET. Per ogni appuntamento di domani
 * (confermato|completato, reminder_sent_at IS NULL) tenta WA + email.
 *
 * Rispetto alla versione legacy:
 *  1. Fuori dalla sessione 24h Meta (free-form rejected) usa un template
 *     UTILITY approvato (`fdl_reminder_giorno_prima`).
 *  2. Logga ogni tentativo in `reminder_send_log` (sent/failed/skipped) per
 *     dare visibilità via `wa_send_failures_recent` view + drawer notifiche.
 *  3. FIX silent-failure: `reminder_sent_at` viene flaggato SOLO se almeno
 *     un canale ha avuto successo. Prima si flaggava sempre → errori muti.
 *  4. Push notification al terminare se ci sono fallimenti.
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
      // Niente canale → flagga sent comunque per non riprovare ogni tick.
      await flagSent(supabase, job.appointmentId, summary);
      continue;
    }

    let anyChannelSucceeded = false;

    if (job.wa) {
      if (!waConfigured) {
        summary.errors.push({
          appointmentId: job.appointmentId,
          channel: "wa",
          error: "META_WA_* env vars not configured",
        });
        await logReminderSend(supabase, {
          appointmentId: job.appointmentId,
          channel: "whatsapp",
          status: "failed",
          error: "META_WA_* env vars not configured",
        });
      } else {
        const useTemplate =
          isTemplatesEnabled() && !(await hasActiveWASession(job.clientId));
        try {
          let metaMessageId: string;
          let usedTemplateName: string | null = null;
          if (useTemplate) {
            const spec = templateForDayBeforeReminder(job);
            metaMessageId = await sendTemplate(
              job.wa.phone,
              spec.name,
              spec.language,
              spec.bodyParams,
              { phoneNumberId, accessToken },
            );
            usedTemplateName = spec.name;
          } else {
            metaMessageId = await sendMessage(
              job.wa.phone,
              renderWhatsAppReminderBody(job),
              { phoneNumberId, accessToken },
            );
          }
          summary.sent_wa += 1;
          anyChannelSucceeded = true;
          await logReminderSend(supabase, {
            appointmentId: job.appointmentId,
            channel: "whatsapp",
            status: "sent",
            metaMessageId,
            usedTemplateName,
          });
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
          await logReminderSend(supabase, {
            appointmentId: job.appointmentId,
            channel: "whatsapp",
            status: "failed",
            error: msg,
            usedTemplateName: useTemplate
              ? templateForDayBeforeReminder(job).name
              : null,
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
          anyChannelSucceeded = true;
          await logReminderSend(supabase, {
            appointmentId: job.appointmentId,
            channel: "email",
            status: "sent",
          });
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
          await logReminderSend(supabase, {
            appointmentId: job.appointmentId,
            channel: "email",
            status: "failed",
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
        await logReminderSend(supabase, {
          appointmentId: job.appointmentId,
          channel: "email",
          status: "failed",
          error: msg,
        });
      }
    }

    if (anyChannelSucceeded) {
      await flagSent(supabase, job.appointmentId, summary);
    }
  }

  if (summary.errors.length > 0) {
    try {
      await sendPushToAll({
        title: "Reminder WA non spediti",
        body: `${summary.errors.length} invii falliti su ${jobs.length}. Controlla notifiche.`,
        url: "/?notifications=open",
        tag: "wa-failures",
      });
    } catch (e) {
      console.error(
        "[cron/reminders] push notification on failure threw:",
        e instanceof Error ? e.message : e,
      );
    }
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

async function logReminderSend(
  supabase: ReturnType<typeof createAdminClient>,
  row: {
    appointmentId: string;
    channel: "whatsapp" | "email";
    status: "sent" | "failed" | "skipped";
    error?: string;
    metaMessageId?: string;
    usedTemplateName?: string | null;
  },
): Promise<void> {
  // reminder_send_log is a fresh table — il tipo generato non l'ha ancora.
  // Cast `as never` per bypassare l'overload-resolution senza disabilitare
  // il type checking sul payload (Supabase JS sa solo che è una table valida).
  const { error } = await supabase
    .from("reminder_send_log" as never)
    .insert({
      appointment_id: row.appointmentId,
      channel: row.channel,
      status: row.status,
      error: row.error ?? null,
      meta_message_id: row.metaMessageId ?? null,
      used_template_name: row.usedTemplateName ?? null,
    } as never);
  if (error) {
    console.error(
      `[cron/reminders] failed to insert reminder_send_log for ${row.appointmentId}:`,
      error.message,
    );
  }
}
