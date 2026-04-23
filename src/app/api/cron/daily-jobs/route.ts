import { NextRequest, NextResponse } from "next/server";
import { autoClassifyClients } from "@/lib/actions/client-segments";
import { runAutomations } from "@/lib/actions/marketing-automations";
import { getScheduledCampaigns, sendCampaignNow } from "@/lib/actions/campaigns";
import {
 createReviewRequest,
 getAppointmentsNeedingReviewRequest,
} from "@/lib/actions/reviews";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
 return new Promise((r) => setTimeout(r, ms));
}

function reviewDelayMs(): number {
 const min = Number(process.env.WA_REVIEW_DELAY_MIN_MS ?? 2000);
 const max = Number(process.env.WA_REVIEW_DELAY_MAX_MS ?? 3000);
 const lo = Number.isFinite(min) && min > 0 ? min : 2000;
 const hi = Number.isFinite(max) && max > lo ? max : lo + 1000;
 return lo + Math.random() * (hi - lo);
}

/**
 * Daily consolidated cron — runs 4 jobs in sequence on Hobby plan (2 cron/day cap).
 *
 * 1. Client segments auto-classify (vip/lotina/inattiva/nuova/lega)
 * 2. Marketing campaigns scheduled for today that haven't fired yet
 * 3. Marketing automation rules (inattività, compleanno, post-visita, ecc)
 * 4. Review requests: per ogni appt stato=completato data=ieri senza
 *    review_request, manda WA con link tracciato /r/<token>
 *
 * Triggered by Vercel cron daily at 03:00 UTC (05:00 Europe/Rome estate).
 * Returns JSON summary with per-job result so logs are observable in Vercel UI.
 */
export async function GET(req: NextRequest) {
 const auth = req.headers.get("authorization") ?? "";
 const secret = process.env.CRON_SECRET ?? "";
 if (!secret || auth !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
 }

 const summary: {
  ok: true;
  startedAt: string;
  segments: { ok: boolean; classified?: number; changed?: number; error?: string };
  campaigns: { ok: boolean; sent?: number; error?: string; campaignIds?: string[] };
  automations: { ok: boolean; totalRuns?: number; error?: string };
  reviews: {
   ok: boolean;
   candidates?: number;
   sent?: number;
   skipped?: number;
   errors?: Array<{ appointmentId: string; error: string }>;
   error?: string;
  };
 } = {
  ok: true,
  startedAt: new Date().toISOString(),
  segments: { ok: false },
  campaigns: { ok: false },
  automations: { ok: false },
  reviews: { ok: false },
 };

 // 1. Client segments
 try {
  const res = await autoClassifyClients();
  summary.segments = {
   ok: true,
   classified: res.classified,
   changed: res.changed,
  };
 } catch (e) {
  summary.segments = {
   ok: false,
   error: e instanceof Error ? e.message : "segments failed",
  };
  console.error("[cron/daily-jobs] segments error:", e);
 }

 // 2. Marketing campaigns scheduled for today/past
 try {
  const scheduled = await getScheduledCampaigns();
  const campaignIds: string[] = [];
  let sent = 0;
  for (const camp of scheduled) {
   try {
    const r = await sendCampaignNow(camp.id);
    sent += r.sent;
    campaignIds.push(camp.id);
   } catch (e) {
    console.error(
     `[cron/daily-jobs] campaign ${camp.id} failed:`,
     e instanceof Error ? e.message : e,
    );
   }
  }
  summary.campaigns = { ok: true, sent, campaignIds };
 } catch (e) {
  summary.campaigns = {
   ok: false,
   error: e instanceof Error ? e.message : "campaigns failed",
  };
  console.error("[cron/daily-jobs] campaigns error:", e);
 }

 // 3. Marketing automations (trigger rules)
 try {
  const res = await runAutomations();
  summary.automations = {
   ok: true,
   totalRuns: res.totalRuns,
  };
 } catch (e) {
  summary.automations = {
   ok: false,
   error: e instanceof Error ? e.message : "automations failed",
  };
  console.error("[cron/daily-jobs] automations error:", e);
 }

 // 4. Review requests (WA post-visita automatico)
 try {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID ?? "";
  const accessToken = process.env.META_WA_ACCESS_TOKEN ?? "";
  const appUrl =
   process.env.NEXT_PUBLIC_APP_URL ||
   process.env.APP_URL ||
   "https://gestionale.fiordilotocb.it";

  const candidates = await getAppointmentsNeedingReviewRequest();
  const errors: Array<{ appointmentId: string; error: string }> = [];
  let sent = 0;
  let skipped = 0;

  if (!phoneNumberId || !accessToken) {
   summary.reviews = {
    ok: false,
    candidates: candidates.length,
    sent: 0,
    skipped: candidates.length,
    error: "META_WA_* env vars not configured",
   };
  } else {
   for (const cand of candidates) {
    try {
     const rr = await createReviewRequest({
      clientId: cand.client_id,
      appointmentId: cand.appointment_id,
      canale: "whatsapp",
     });
     if (!rr.ok) {
      skipped++;
      errors.push({
       appointmentId: cand.appointment_id,
       error: rr.error,
      });
      continue;
     }
     const link = `${appUrl.replace(/\/$/, "")}/r/${rr.token}`;
     const firstName = (cand.client_nome || "").split(" ")[0] || "";
     const body = firstName
      ? `Ciao ${firstName} 🌸 come è andata oggi da noi? Se ti va, raccontami qui: ${link}`
      : `Ciao 🌸 come è andata oggi da noi? Se ti va, raccontami qui: ${link}`;
     await sendMessage(cand.client_telefono, body, {
      phoneNumberId,
      accessToken,
     });
     sent++;
     // Throttle jitter 2-3s anti-spam Meta
     await sleep(reviewDelayMs());
    } catch (e) {
     const msg = e instanceof Error ? e.message : "send failed";
     console.error(
      `[cron/daily-jobs] review request appt ${cand.appointment_id}:`,
      msg,
     );
     errors.push({ appointmentId: cand.appointment_id, error: msg });
    }
   }
   summary.reviews = {
    ok: true,
    candidates: candidates.length,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
   };
  }
 } catch (e) {
  summary.reviews = {
   ok: false,
   error: e instanceof Error ? e.message : "reviews failed",
  };
  console.error("[cron/daily-jobs] reviews error:", e);
 }

 return NextResponse.json(summary, { status: 200 });
}
