import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDueFollowUps } from "@/lib/actions/service-followups";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

export const runtime = "nodejs";
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

type FollowUpError = {
  appointmentId: string;
  ruleId: string;
  error: string;
};

type RunSummary = {
  ok: true;
  candidates: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: FollowUpError[];
};

/**
 * Hourly follow-up cron — Vercel cron `0 * * * *`.
 *
 * Pattern speculare a /api/cron/reminders:
 *  - Bearer CRON_SECRET auth
 *  - getDueFollowUps(now) ritorna i (appt, rule) pronti per invio
 *  - Per ogni job: render già fatto in getDueFollowUps, send WA, dedup row
 *  - Jitter 2-4s tra invii
 *
 * NB: questo cron NON gestisce -24h (day-before) — quello è gestito da
 * /api/cron/reminders. I tre offset attivi sono -12h, +12h, +24h.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const jobs = await getDueFollowUps(now);

  const summary: RunSummary = {
    ok: true,
    candidates: jobs.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID ?? "";
  const accessToken = process.env.META_WA_ACCESS_TOKEN ?? "";
  const waConfigured = Boolean(phoneNumberId && accessToken);

  const supabase = createAdminClient();

  for (const job of jobs) {
    if (!waConfigured) {
      summary.skipped += 1;
      summary.errors.push({
        appointmentId: job.appointmentId,
        ruleId: job.ruleId,
        error: "META_WA_* env vars not configured",
      });
      // Logga anche nel dedup come 'skipped' così non riproviamo all'infinito
      await recordSent(supabase, job.appointmentId, job.ruleId, "skipped", "no_wa_config");
      continue;
    }

    try {
      await sendMessage(job.clientPhone, job.message, {
        phoneNumberId,
        accessToken,
      });
      summary.sent += 1;
      await recordSent(supabase, job.appointmentId, job.ruleId, "sent", null);
      await sleep(jitterDelayMs());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "wa send failed";
      console.error(
        `[cron/service-follow-ups] wa failed for appt ${job.appointmentId} rule ${job.ruleId}:`,
        msg,
      );
      summary.failed += 1;
      summary.errors.push({
        appointmentId: job.appointmentId,
        ruleId: job.ruleId,
        error: msg,
      });
      await recordSent(supabase, job.appointmentId, job.ruleId, "failed", msg);
    }
  }

  return NextResponse.json(summary, { status: 200 });
}

async function recordSent(
  supabase: ReturnType<typeof createAdminClient>,
  appointmentId: string,
  ruleId: string,
  status: "sent" | "failed" | "skipped",
  error: string | null,
): Promise<void> {
  const { error: dbErr } = await supabase
    .from("appointment_followups_sent")
    .insert({
      appointment_id: appointmentId,
      rule_id: ruleId,
      channel: "whatsapp",
      status,
      error,
    });
  if (dbErr) {
    console.error(
      `[cron/service-follow-ups] failed to record sent row for appt ${appointmentId} rule ${ruleId}:`,
      dbErr.message,
    );
  }
}
