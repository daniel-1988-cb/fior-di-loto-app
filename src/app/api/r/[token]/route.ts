import { NextRequest, NextResponse } from "next/server";
import { trackReviewClick } from "@/lib/actions/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redirect tracker per il link nei messaggi WA recensione.
 *
 * Flow:
 *   cliente clicca https://app.example/r/<token>
 *     → track click (setta clicked_at se NULL)
 *     → redirect 302 a /recensione/<token> (landing pubblica)
 *
 * Token invalido/sconosciuto → 404.
 * Non reindirizziamo direttamente su Google: prima raccogliamo rating interno
 * per poter filtrare le review a 1-3 stelle come feedback privato.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const row = await trackReviewClick(token);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const target = new URL(`/recensione/${token}`, req.url);
  return NextResponse.redirect(target, 302);
}
