import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  verifySignature,
  parseInbound,
  sendMessage,
  sendWithHumanDelay,
  downloadMedia,
} from "@/lib/bot/whatsapp-meta";
import { detectIntent } from "@/lib/bot/intent";
import { generateReply } from "@/lib/bot/llm";
import { getActiveBotDocuments } from "@/lib/actions/wa-bot-documents";
import {
  getClientContextForBot,
  buildClientContextPrompt,
} from "@/lib/actions/bot-client-context";

export const runtime = "nodejs";

const OPT_OUT_ACK =
  "Ok, non ti scriverò più. Se cambi idea, basta che mi scrivi e ti riattivo.";

const AUDIO_UNCLEAR_REPLY =
  "ciao 🙏 non ho sentito bene il tuo vocale, mi scrivi per favore?";
const AUDIO_PLACEHOLDER = "[🎤 audio]";

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

  // Next 16 `after()` keeps the serverless function alive until the
  // callback finishes, so the async processing won't get truncated the
  // way it could with queueMicrotask once the response is returned.
  after(() => processPayload(rawBody).catch((e) => console.error("[wa webhook]", e)));
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

    // Pre-download the audio binary (if any) once, so it's available both
    // for logging the inbound turn and for the Gemini call below.
    let audioInput: { data: Buffer; mimeType: string } | null = null;
    if (msg.kind === "audio" && msg.audioId) {
      try {
        audioInput = await downloadMedia(msg.audioId, {
          accessToken: process.env.META_WA_ACCESS_TOKEN!,
        });
      } catch (e) {
        console.error("[wa webhook] audio download failed", e);
      }
    }

    const inboundContent =
      msg.kind === "audio" ? AUDIO_PLACEHOLDER : (msg.text ?? "");

    await supabase.from("wa_conversations").insert({
      client_id: clientId,
      role: "user",
      content: inboundContent,
      meta_message_id: msg.metaMessageId,
    });

    // Thread upsert: creiamo il record se manca, ma NON forziamo lo status
    // a "active" — altrimenti un takeover operatore verrebbe sbloccato ad
    // ogni messaggio in arrivo. Quindi status viene settato solo in insert
    // tramite onConflict → ignoreDuplicates non è supportato, quindi:
    // - se il thread esiste: aggiorniamo solo last_message_at
    // - se non esiste: lo creiamo con status "active" (default)
    const { data: existingThread } = await supabase
      .from("wa_threads")
      .select("client_id, status")
      .eq("client_id", clientId)
      .maybeSingle();

    if (existingThread) {
      await supabase
        .from("wa_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("client_id", clientId);
    } else {
      await supabase
        .from("wa_threads")
        .insert({
          client_id: clientId,
          last_message_at: new Date().toISOString(),
          status: "active",
        });
    }

    // Intent detection only applies to text messages; audio is handed
    // straight to Gemini (no opt-out / escalate keywords in a vocale are
    // acted on programmatically — Marialucia will reply naturally).
    const intent =
      msg.kind === "text" ? detectIntent(msg.text ?? "") : "generic";

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

    // Takeover operatore: se l'operatore ha preso il controllo del thread,
    // il bot non deve rispondere. Il messaggio in ingresso è già stato
    // salvato (sopra) e sarà visibile nel gestionale.
    // NB: questo check viene DOPO opt_out ed escalate, perché sono azioni
    // legate alla volontà del cliente e devono restare funzionanti anche
    // in modalità takeover.
    if (existingThread?.status === "human_takeover") {
      console.log(
        "[wa webhook] thread in human takeover, skipping AI reply",
        clientId,
      );
      continue;
    }

    const { data: history } = await supabase
      .from("wa_conversations")
      .select("role, content")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(50);

    const docs = await getActiveBotDocuments();

    // Enrichment: se il cliente è già nel DB (non è il placeholder
    // "Nuovo Contatto WA"), carichiamo il suo contesto (profilo +
    // appuntamenti futuri/passati + vouchers + programmi) e lo iniettiamo
    // nel systemInstruction così Marialucia può personalizzare la risposta.
    const clientCtx = await getClientContextForBot(clientId);
    const clientContextText = await buildClientContextPrompt(clientCtx);

    const rawReply = await generateReply({
      history: (history ?? []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      apiKey: process.env.GEMINI_API_KEY!,
      documents: docs.map((d) => ({ titolo: d.titolo, contenuto: d.contenuto })),
      clientContext: clientContextText,
      ...(audioInput ? { audioInput } : {}),
    });
    if (!rawReply) continue;

    // If the audio was unclear, Gemini returns the AUDIO_UNCLEAR sentinel
    // (sometimes wrapped in whitespace/backticks). Swap for the hardcoded
    // "please type" fallback.
    const isUnclear =
      msg.kind === "audio" && /AUDIO_UNCLEAR/i.test(rawReply);
    const reply = isUnclear ? AUDIO_UNCLEAR_REPLY : rawReply;

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
