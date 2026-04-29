// 24h-session helper per WhatsApp Cloud API.
//
// Meta consente messaggi free-form (type: "text") solo se l'utente ha
// scritto al business nelle ultime 24h. Fuori da quella finestra serve
// un Message Template approvato (UTILITY/MARKETING/AUTHENTICATION).
//
// `hasActiveWASession` controlla se esiste un messaggio inbound
// (role = "user") in `wa_conversations` per questo client negli
// ultimi 24h. Se sì → libera la free-form, altrimenti il chiamante
// deve usare un template.

import { createAdminClient } from "@/lib/supabase/admin";

export const WA_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function hasActiveWASession(clientId: string): Promise<boolean> {
  if (!clientId) return false;
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - WA_SESSION_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("wa_conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("role", "user")
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();
  if (error) {
    // Su errore di lettura, fallback prudente: NO sessione attiva → forza template.
    // Meglio spedire un template (sempre lecito) che falsi-positivi free-form.
    console.error("[wa-session] read error:", error.message);
    return false;
  }
  return Boolean(data);
}
