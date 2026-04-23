import { NextRequest, NextResponse } from "next/server";
import { runAutomations } from "@/lib/actions/marketing-automations";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Daily automations cron — 09:00 UTC (11:00 Rome) via Vercel cron.
 *
 * Delegates to runAutomations(): iterate attivo=true rules, evaluate
 * trigger against the client base, dedup vs last 24h sent_messages,
 * and send. Idempotent enough to re-run manually the same day without
 * double-sending.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomations();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[cron/marketing-automations]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
