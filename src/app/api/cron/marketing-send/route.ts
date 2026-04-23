import { NextRequest, NextResponse } from "next/server";
import { getScheduledCampaigns, sendCampaignNow } from "@/lib/actions/campaigns";

export const runtime = "nodejs";
// 300s covers ~50 campaigns per tick, each with ~100 recipients and
// 1-3s WA jitter. If the salon ever schedules heavier blasts, raise this.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Scheduled campaigns cron — every 15 min via Vercel cron (Bearer CRON_SECRET).
 *
 * Picks every campaign with stato='programmata' and schedule_at <= now,
 * and fires sendCampaignNow on each. A single failing campaign does not
 * abort the run — per-campaign errors are collected in the response.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const due = await getScheduledCampaigns();
    const results: Array<{
      campaignId: string;
      nome: string;
      sent: number;
      failed: number;
      skipped: number;
      error?: string;
    }> = [];

    for (const c of due) {
      try {
        const s = await sendCampaignNow(c.id);
        results.push({
          campaignId: c.id,
          nome: c.nome,
          sent: s.sent,
          failed: s.failed,
          skipped: s.skipped,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "send failed";
        console.error(`[cron/marketing-send] campaign ${c.id}:`, msg);
        results.push({
          campaignId: c.id,
          nome: c.nome,
          sent: 0,
          failed: 0,
          skipped: 0,
          error: msg,
        });
      }
    }

    return NextResponse.json({ ok: true, due: due.length, results }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[cron/marketing-send]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
