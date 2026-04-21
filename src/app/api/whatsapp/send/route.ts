import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = process.env.BOT_SEND_BEARER_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { clientId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.clientId || !body.text) {
    return NextResponse.json({ error: "clientId and text required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: client } = await supabase
    .from("clients")
    .select("id, telefono, wa_opt_in")
    .eq("id", body.clientId)
    .single();

  if (!client || !client.telefono) {
    return NextResponse.json({ error: "Client not found or no phone" }, { status: 404 });
  }
  if (!client.wa_opt_in) {
    return NextResponse.json({ error: "Client has no WA opt-in" }, { status: 403 });
  }

  const phone = client.telefono.replace(/\D/g, "");

  try {
    const metaId = await sendMessage(phone, body.text, {
      phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
      accessToken: process.env.META_WA_ACCESS_TOKEN!,
    });
    await supabase.from("wa_conversations").insert({
      client_id: client.id,
      role: "assistant",
      content: body.text,
      meta_message_id: metaId,
    });
    return NextResponse.json({ metaMessageId: metaId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
