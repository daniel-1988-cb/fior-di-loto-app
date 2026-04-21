import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  verifySignature,
  parseInbound,
  sendMessage,
  sendWithHumanDelay,
} from "@/lib/bot/whatsapp-meta";
import { detectIntent } from "@/lib/bot/intent";
import { generateReply } from "@/lib/bot/claude";

export const runtime = "nodejs";

const OPT_OUT_ACK =
  "Ok, non ti scriverò più. Se cambi idea, basta che mi scrivi e ti riattivo.";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode") ?? "";
  const token = req.nextUrl.searchParams.get("hub.verify_token") ?? "";
  const challenge = req.nextUrl.searchParams.get("hub.challenge") ?? "";
  const expected = process.env.META_WA_VERIFY_TOKEN ?? "";
  const result = verifyWebhook(mode, token, challenge, expected);
  if (result === null) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(result, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = process.env.META_WA_APP_SECRET ?? "";
  if (!appSecret || !verifySignature(rawBody, signature, appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  queueMicrotask(() => processPayload(rawBody).catch((e) => console.error("[wa webhook]", e)));
  return new NextResponse("OK", { status: 200 });
}

async function processPayload(rawBody: string): Promise<void> {
  const payload = JSON.parse(rawBody);
  const messages = parseInbound(payload);
  if (messages.length === 0) return;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  for (const msg of messages) {
    const phoneWithPlus = "+" + msg.fromPhone;

    // Race-safe upsert: try insert first; on duplicate (unique index on
    // clients.telefono), fall back to SELECT + touch of wa_last_seen.
    // This avoids a lookup+insert TOCTOU window where two concurrent
    // webhooks on the same number could otherwise create 2 rows.
    let clientId: string;
    let waOptIn = true;

    const { data: inserted, error: insertErr } = await supabase
      .from("clients")
      .insert({
        nome: "Nuovo",
        cognome: "Contatto WA",
        telefono: phoneWithPlus,
        segmento: "lead",
        fonte: "whatsapp",
        wa_last_seen: new Date().toISOString(),
        wa_opt_in: true,
      })
      .select("id, wa_opt_in")
      .single();

    if (inserted) {
      clientId = inserted.id;
      waOptIn = inserted.wa_opt_in;
    } else {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, wa_opt_in")
        .eq("telefono", phoneWithPlus)
        .single();
      if (!existing) {
        console.error(
          "[wa webhook] client lookup failed after insert error",
          insertErr,
        );
        continue;
      }
      clientId = existing.id;
      waOptIn = existing.wa_opt_in;
      await supabase
        .from("clients")
        .update({ wa_last_seen: new Date().toISOString() })
        .eq("id", clientId);
    }

    await supabase.from("wa_conversations").insert({
      client_id: clientId,
      role: "user",
      content: msg.text,
      meta_message_id: msg.metaMessageId,
    });

    await supabase
      .from("wa_threads")
      .upsert(
        { client_id: clientId, last_message_at: new Date().toISOString(), status: "active" },
        { onConflict: "client_id" },
      );

    const intent = detectIntent(msg.text);

    if (intent === "opt_out") {
      // Sticky opt-out + hardcoded ack (no Claude).
      await supabase.from("clients").update({ wa_opt_in: false }).eq("id", clientId);
      try {
        const ackId = await sendMessage(msg.fromPhone, OPT_OUT_ACK, {
          phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
          accessToken: process.env.META_WA_ACCESS_TOKEN!,
        });
        await supabase.from("wa_conversations").insert({
          client_id: clientId,
          role: "assistant",
          content: OPT_OUT_ACK,
          meta_message_id: ackId,
        });
      } catch (e) {
        console.error("[wa webhook] opt-out ack failed", e);
      }
      continue;
    }

    if (intent === "escalate") {
      await supabase
        .from("wa_threads")
        .update({ status: "escalated" })
        .eq("client_id", clientId);
      continue;
    }

    // Sticky opt-out: if a previous message flipped wa_opt_in to false,
    // we still log the inbound (above) but must not generate a reply.
    if (!waOptIn) {
      console.warn("[wa webhook] client opt-out, skipping AI reply", clientId);
      continue;
    }

    const { data: history } = await supabase
      .from("wa_conversations")
      .select("role, content")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(50);

    const reply = await generateReply({
      history: (history ?? []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    if (!reply) continue;

    try {
      const metaId = await sendWithHumanDelay(msg.fromPhone, reply, {
        phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
        accessToken: process.env.META_WA_ACCESS_TOKEN!,
      });
      await supabase.from("wa_conversations").insert({
        client_id: clientId,
        role: "assistant",
        content: reply,
        meta_message_id: metaId,
      });
    } catch (e) {
      console.error("[wa webhook] send failed", e);
    }
  }
}
