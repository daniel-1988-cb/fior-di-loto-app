"use server";

export async function sendBotMessage(
 clientId: string,
 text: string,
): Promise<{ ok: boolean; error?: string }> {
 const token = process.env.BOT_SEND_BEARER_TOKEN;
 if (!token) return { ok: false, error: "BOT_SEND_BEARER_TOKEN not configured" };
 try {
  const res = await fetch(
   `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/whatsapp/send`,
   {
    method: "POST",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ clientId, text }),
    cache: "no-store",
   },
  );
  if (!res.ok) {
   const e = (await res.json().catch(() => ({}))) as { error?: string };
   return { ok: false, error: e.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
 } catch (e) {
  return { ok: false, error: e instanceof Error ? e.message : "send error" };
 }
}
