import { NextRequest, NextResponse } from "next/server";
import { autoClassifyClients } from "@/lib/actions/client-segments";
import { runAutomations } from "@/lib/actions/marketing-automations";
import { getScheduledCampaigns, sendCampaignNow } from "@/lib/actions/campaigns";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Daily consolidated cron — runs 3 jobs in sequence on Hobby plan (2 cron/day cap).
 *
 * 1. Client segments auto-classify (vip/lotina/inattiva/nuova/lead)
 * 2. Marketing campaigns scheduled for today that haven't fired yet
 * 3. Marketing automation rules (inattività, compleanno, post-visita, ecc)
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
 } = {
  ok: true,
  startedAt: new Date().toISOString(),
  segments: { ok: false },
  campaigns: { ok: false },
  automations: { ok: false },
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

 return NextResponse.json(summary, { status: 200 });
}
