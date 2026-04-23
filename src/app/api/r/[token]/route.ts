import { NextRequest, NextResponse } from "next/server";
import { trackReviewClick } from "@/lib/actions/reviews";
import { getBusinessSettings } from "@/lib/actions/business";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redirect tracker per il link nei messaggi WA recensione.
 *
 * Flow (NUOVO, compliant Google policy):
 *   cliente clicca https://app.example/r/<token>
 *     → track click (setta clicked_at se NULL)
 *     → se business_settings.google_review_url configurato:
 *         redirect 302 DIRETTO a Google Maps review page
 *         (massimizza volume recensioni organiche — policy-safe)
 *     → altrimenti: fallback landing interna /recensione/<token>
 *         (quando la URL Google non è ancora stata configurata)
 *
 * Nota policy: Google vieta esplicitamente il review gating (pre-screen
 * rating prima del redirect). Mandare TUTTI direttamente a Google è
 * l'unica modalità conforme e massimizza volume recensioni.
 *
 * Token invalido/sconosciuto → 404.
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

  const settings = await getBusinessSettings();
  const googleUrl = settings?.google_review_url?.trim();

  if (googleUrl && /^https?:\/\//i.test(googleUrl)) {
    // Segna che abbiamo mandato a Google (per stats) — best-effort, non blocca
    try {
      const supabase = createAdminClient();
      await supabase
        .from("review_requests")
        .update({ redirected_google: true })
        .eq("token", token);
    } catch {
      /* ignore tracking errors */
    }
    return NextResponse.redirect(googleUrl, 302);
  }

  // Fallback landing interna se Google URL non configurata
  const target = new URL(`/recensione/${token}`, req.url);
  return NextResponse.redirect(target, 302);
}
