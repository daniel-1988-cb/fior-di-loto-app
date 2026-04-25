"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import { getCurrentUser } from "@/lib/actions/ai-assistant";
import {
  VALID_DOCUMENT_TIPI,
  type ClientDocument,
  type DocumentTipo,
} from "@/lib/types/client-documents";

const STORAGE_BUCKET = "client-documents";

export async function listClientDocuments(clientId: string): Promise<ClientDocument[]> {
  if (!isValidUUID(clientId)) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[client-documents] listClientDocuments error:", error);
    return [];
  }
  return (data as ClientDocument[]) || [];
}

export async function createClientDocument(input: {
  clientId: string;
  nome: string;
  tipo?: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  note?: string | null;
}): Promise<ClientDocument> {
  if (!isValidUUID(input.clientId)) throw new Error("ID cliente non valido");
  const safeNome = truncate(sanitizeString(input.nome || ""), 200).trim();
  if (!safeNome) throw new Error("Nome documento obbligatorio");
  if (!input.storagePath?.trim()) throw new Error("storage_path obbligatorio");

  const tipo: DocumentTipo = (VALID_DOCUMENT_TIPI as readonly string[]).includes(
    input.tipo || ""
  )
    ? (input.tipo as DocumentTipo)
    : "altro";

  const note = input.note
    ? truncate(sanitizeString(input.note), 1000) || null
    : null;

  const user = await getCurrentUser();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: input.clientId,
      nome: safeNome,
      tipo,
      storage_path: input.storagePath,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      uploaded_by: user?.id ?? null,
      note,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClientDocument;
}

export async function deleteClientDocument(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID documento non valido" };
  const supabase = createAdminClient();

  const { data: row, error: rErr } = await supabase
    .from("client_documents")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (rErr) return { ok: false, error: rErr.message };
  if (!row) return { ok: false, error: "Documento non trovato" };

  // Best-effort cleanup dello storage. Se fallisce la rimozione del file ma
  // la riga DB viene cancellata, l'orfano resta — non è blocking ma viene
  // loggato.
  const storagePath = (row as { storage_path: string }).storage_path;
  if (storagePath) {
    const { error: sErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    if (sErr) {
      console.warn("[client-documents] storage remove error (non-fatal):", sErr);
    }
  }

  const { error: dErr } = await supabase
    .from("client_documents")
    .delete()
    .eq("id", id);
  if (dErr) return { ok: false, error: dErr.message };

  return { ok: true };
}

export async function getDocumentDownloadUrl(id: string): Promise<string | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("client_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return null;
  const storagePath = (row as { storage_path: string }).storage_path;
  if (!storagePath) return null;
  const { data: signed, error: sErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (sErr || !signed?.signedUrl) {
    console.error("[client-documents] createSignedUrl error:", sErr);
    return null;
  }
  return signed.signedUrl;
}
