"use server";

import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveSubscriptionInput = {
 endpoint: string;
 p256dh: string;
 auth: string;
 userAgent?: string;
 label?: string;
};

export type PushPayload = {
 title: string;
 body: string;
 /** Path a cui navigare al click della notifica (default /agenda). */
 url?: string;
 /** Tag per raggruppamento/deduplica OS-level (iOS/Android dedup). */
 tag?: string;
 /** Badge count Android. */
 badge?: number;
};

function configure() {
 const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
 const priv = process.env.VAPID_PRIVATE_KEY;
 const subj = process.env.VAPID_SUBJECT;
 if (!pub || !priv || !subj) {
  throw new Error("VAPID keys not configured");
 }
 webpush.setVapidDetails(subj, pub, priv);
}

export async function saveSubscription(
 input: SaveSubscriptionInput,
): Promise<{ ok: boolean; error?: string }> {
 if (!input.endpoint || !input.p256dh || !input.auth) {
  return { ok: false, error: "Subscription incompleta" };
 }
 const supabase = createAdminClient();
 const { error } = await supabase
  .from("push_subscriptions")
  .upsert(
   {
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
    label: input.label ?? null,
    last_seen: new Date().toISOString(),
   },
   { onConflict: "endpoint" },
  );
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}

export async function deleteSubscription(
 endpoint: string,
): Promise<{ ok: boolean; error?: string }> {
 const supabase = createAdminClient();
 const { error } = await supabase
  .from("push_subscriptions")
  .delete()
  .eq("endpoint", endpoint);
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}

export async function listSubscriptions(): Promise<
 Array<{ id: string; endpoint: string; userAgent: string | null; label: string | null; createdAt: string }>
> {
 const supabase = createAdminClient();
 const { data } = await supabase
  .from("push_subscriptions")
  .select("id, endpoint, user_agent, label, created_at")
  .order("created_at", { ascending: false });
 return (data ?? []).map((r) => ({
  id: r.id,
  endpoint: r.endpoint,
  userAgent: r.user_agent,
  label: r.label,
  createdAt: r.created_at,
 }));
}

/**
 * Invia una push notification a TUTTI gli endpoint registrati.
 * Se un endpoint ritorna 404/410 (client unsubscribed), lo elimina dalla table.
 * Ritorna il conteggio ok / failed.
 */
export async function sendPushToAll(
 payload: PushPayload,
): Promise<{ sent: number; removed: number; errors: number }> {
 try {
  configure();
 } catch (e) {
  console.error("[push] VAPID not configured:", e instanceof Error ? e.message : e);
  return { sent: 0, removed: 0, errors: 0 };
 }

 const supabase = createAdminClient();
 const { data: subs } = await supabase
  .from("push_subscriptions")
  .select("id, endpoint, p256dh, auth");
 if (!subs || subs.length === 0) return { sent: 0, removed: 0, errors: 0 };

 const body = JSON.stringify({
  title: payload.title,
  body: payload.body,
  url: payload.url ?? "/agenda",
  tag: payload.tag,
  badge: payload.badge,
 });

 let sent = 0;
 let removed = 0;
 let errors = 0;

 await Promise.all(
  subs.map(async (s) => {
   const subscription: WebPushSubscription = {
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
   };
   try {
    await webpush.sendNotification(subscription, body);
    sent += 1;
    // Aggiorna last_seen (best-effort)
    await supabase
     .from("push_subscriptions")
     .update({ last_seen: new Date().toISOString() })
     .eq("id", s.id);
   } catch (e) {
    const statusCode = (e as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
     // Subscription expired/unsubscribed — rimuovi
     await supabase.from("push_subscriptions").delete().eq("id", s.id);
     removed += 1;
    } else {
     console.error(
      `[push] failed endpoint ${s.endpoint.slice(0, 40)}…:`,
      e instanceof Error ? e.message : e,
     );
     errors += 1;
    }
   }
  }),
 );

 return { sent, removed, errors };
}
