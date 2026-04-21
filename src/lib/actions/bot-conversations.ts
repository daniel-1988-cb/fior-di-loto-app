"use server";

import { createClient } from "@/lib/supabase/server";

export type ThreadListItem = {
 clientId: string;
 clientName: string;
 clientPhone: string | null;
 lastMessageAt: string;
 status: string;
 unreadCount: number;
 lastPreview: string | null;
};

// wa_threads.status valid values:
//  - "active"         → bot automatico attivo (default)
//  - "human_takeover" → operatore gestisce manualmente, bot sospeso
//  - "archived"       → conversazione archiviata
//  - "escalated"      → flaggata per escalation umana da intent detector
// Lo schema resta varchar(20) (vedi src/lib/db/schema.ts), nessuna migration.

export async function getBotThreads(): Promise<ThreadListItem[]> {
 const supabase = await createClient();
 const { data: threads } = await supabase
  .from("wa_threads")
  .select("client_id, last_message_at, status, unread_count")
  .order("last_message_at", { ascending: false })
  .limit(100);

 if (!threads || threads.length === 0) return [];

 const clientIds = threads.map((t) => t.client_id);
 const { data: clients } = await supabase
  .from("clients")
  .select("id, nome, cognome, telefono")
  .in("id", clientIds);

 const { data: lastMessages } = await supabase
  .from("wa_conversations")
  .select("client_id, content, created_at")
  .in("client_id", clientIds)
  .order("created_at", { ascending: false });

 const lastByClient = new Map<string, string>();
 for (const m of lastMessages ?? []) {
  if (!lastByClient.has(m.client_id)) lastByClient.set(m.client_id, m.content);
 }

 const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

 return threads.map((t) => {
  const c = clientById.get(t.client_id);
  return {
   clientId: t.client_id,
   clientName: c ? `${c.nome} ${c.cognome}` : "Sconosciuto",
   clientPhone: c?.telefono ?? null,
   lastMessageAt: t.last_message_at,
   status: t.status,
   unreadCount: t.unread_count,
   lastPreview: lastByClient.get(t.client_id)?.slice(0, 80) ?? null,
  };
 });
}

export async function getBotConversation(clientId: string) {
 const supabase = await createClient();
 const { data: messages } = await supabase
  .from("wa_conversations")
  .select("id, role, content, created_at")
  .eq("client_id", clientId)
  .order("created_at", { ascending: true });
 const { data: client } = await supabase
  .from("clients")
  .select("id, nome, cognome, telefono, segmento")
  .eq("id", clientId)
  .single();
 const { data: thread } = await supabase
  .from("wa_threads")
  .select("status, last_message_at")
  .eq("client_id", clientId)
  .single();
 return { client, messages: messages ?? [], thread };
}

export async function setThreadMode(
 clientId: string,
 mode: "active" | "human_takeover" | "archived",
): Promise<{ ok: boolean; error?: string }> {
 const supabase = await createClient();
 const { error } = await supabase
  .from("wa_threads")
  .update({ status: mode })
  .eq("client_id", clientId);
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}

export async function sendManualReply(
 clientId: string,
 text: string,
): Promise<{ ok: boolean; error?: string }> {
 const token = process.env.BOT_SEND_BEARER_TOKEN;
 const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://fior-di-loto-app.vercel.app";
 if (!token) return { ok: false, error: "BOT_SEND_BEARER_TOKEN not configured" };
 try {
  const res = await fetch(`${url}/api/whatsapp/send`, {
   method: "POST",
   headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
   },
   body: JSON.stringify({ clientId, text }),
   cache: "no-store",
  });
  if (!res.ok) {
   const e = (await res.json().catch(() => ({}))) as { error?: string };
   return { ok: false, error: e.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
 } catch (e) {
  return { ok: false, error: e instanceof Error ? e.message : "send failed" };
 }
}
