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
 return { client, messages: messages ?? [] };
}
