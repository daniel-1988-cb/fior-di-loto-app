import { NextRequest, NextResponse } from "next/server";
import { autoClassifyClients } from "@/lib/actions/client-segments";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Nightly segmento auto-classify cron — called by Vercel cron (Bearer CRON_SECRET).
 *
 * Walks every client and writes back the segmento computed from real YTD
 * activity (visite completate + entrate). Idempotent.
 *
 * Schedule: 0 3 * * * (03:00 UTC = 04:00/05:00 Rome). Runs before the
 * reminders job (15 UTC) so the morning list already reflects any
 * segmento that flipped to 'inattiva' overnight.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoClassifyClients();
    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[cron/client-segments]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
