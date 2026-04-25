import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/security/validate";
import { createClientDocument } from "@/lib/actions/client-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const STORAGE_BUCKET = "client-documents";
const ALLOWED_PREFIXES = ["image/", "application/pdf"];

function isAllowedMime(mime: string | null): boolean {
  if (!mime) return false;
  return ALLOWED_PREFIXES.some((p) =>
    p.endsWith("/") ? mime.startsWith(p) : mime === p
  );
}

function sanitizeFilename(name: string): string {
  // Tieni estensione + lettere/numeri/._-
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-150);
  return cleaned || "file";
}

export async function POST(req: NextRequest) {
  // Auth: solo utenti autenticati
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Multipart non valido" },
      { status: 400 }
    );
  }

  const clientId = String(formData.get("clientId") || "");
  if (!isValidUUID(clientId)) {
    return NextResponse.json(
      { error: "ID cliente non valido" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File vuoto" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Il file supera la dimensione massima di 10 MB" },
      { status: 400 }
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!isAllowedMime(mime)) {
    return NextResponse.json(
      { error: "Tipo file non consentito (solo immagini o PDF)" },
      { status: 400 }
    );
  }

  const tipoRaw = String(formData.get("tipo") || "altro");
  const nomeRaw = String(formData.get("nome") || "").trim();
  const noteRaw = String(formData.get("note") || "").trim();

  // Path storage: {clientId}/{uuid}-{filename}
  const safeName = sanitizeFilename(file.name || "file");
  const uuid = crypto.randomUUID();
  const storagePath = `${clientId}/${uuid}-${safeName}`;

  const supabase = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });
  if (upErr) {
    console.error("[client-documents] upload error:", upErr);
    return NextResponse.json(
      { error: `Errore upload: ${upErr.message}` },
      { status: 500 }
    );
  }

  try {
    const doc = await createClientDocument({
      clientId,
      nome: nomeRaw || file.name || "Documento",
      tipo: tipoRaw,
      storagePath,
      mimeType: mime,
      sizeBytes: file.size,
      note: noteRaw || null,
    });
    return NextResponse.json({ ok: true, document: doc });
  } catch (err) {
    // Rollback storage in caso di insert DB fallito
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    const message =
      err instanceof Error ? err.message : "Errore salvataggio documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
