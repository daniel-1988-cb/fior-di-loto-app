import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDocumentDownloadUrl } from "@/lib/actions/client-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/client-documents/[id]/download
 * Restituisce un redirect 302 verso una signed URL del bucket
 * `client-documents` valida 60 secondi. Richiede utente autenticato.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const url = await getDocumentDownloadUrl(id);
  if (!url) {
    return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
  }
  return NextResponse.redirect(url, 302);
}
