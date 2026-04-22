import { NextRequest, NextResponse, after } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
import { createBookingRequest, BOOKING_ACK_REPLY } from "@/lib/bot/booking";
import { aggregateClaimedRows } from "@/lib/bot/message-buffer";
import { getActiveBotDocuments } from "@/lib/actions/wa-bot-documents";
import {
  getClientContextForBot,
  buildClientContextPrompt,
} from "@/lib/actions/bot-client-context";

export const runtime = "nodejs";
// `after()` extends the serverless invocation, but we still want headroom
// for the buffered path: 4s sleep + Gemini call (2-5s) + WA send.
export const maxDuration = 30;

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

    if (intent === "booking_request") {
      // Park the request for Laura to triage; don't bother Gemini.
      try {
        await createBookingRequest(supabase, clientId, msg.text ?? "");
      } catch (e) {
        console.error("[wa webhook] booking request insert failed", e);
      }
      try {
        const ackId = await sendMessage(msg.fromPhone, BOOKING_ACK_REPLY, {
          phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
          accessToken: process.env.META_WA_ACCESS_TOKEN!,
        });
        await supabase.from("wa_conversations").insert({
          client_id: clientId,
          role: "assistant",
          content: BOOKING_ACK_REPLY,
          meta_message_id: ackId,
        });
      } catch (e) {
        console.error("[wa webhook] booking ack send failed", e);
      }
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

    const bufferEnabled = process.env.WA_BUFFER_ENABLED === "true";
    const canBuffer = bufferEnabled && msg.kind === "text" && (msg.text ?? "").length > 0;

    if (canBuffer) {
      // Insert into the buffer, then schedule a deferred claim+reply.
      // Multiple messages from the same phone within the window will all
      // hit the same claim: only one after() callback actually processes
      // (atomic UPDATE ... WHERE processed_at IS NULL), the rest no-op.
      await supabase.from("wa_message_buffer").insert({
        phone: phoneWithPlus,
        content: msg.text ?? "",
      });

      after(async () => {
        try {
          await new Promise((r) => setTimeout(r, 4000));
          const { data: claimed, error } = await supabase
            .from("wa_message_buffer")
            .update({ processed_at: new Date().toISOString() })
            .eq("phone", phoneWithPlus)
            .is("processed_at", null)
            .select("content, received_at");
          if (error) {
            console.error("[wa webhook] buffer claim failed", error);
            return;
          }
          if (!claimed || claimed.length === 0) return; // another handler won the race
          const aggregated = aggregateClaimedRows(
            claimed.map((r) => ({
              content: r.content as string,
              receivedAt: r.received_at as string,
            })),
          );
          if (!aggregated) return;
          await generateAndSendReply(supabase, {
            clientId,
            fromPhone: msg.fromPhone,
            isAudio: false,
            audioInput: null,
            overrideLastUserText: aggregated,
          });
        } catch (e) {
          console.error("[wa webhook] buffered handler failed", e);
        }
      });
      continue;
    }

    await generateAndSendReply(supabase, {
      clientId,
      fromPhone: msg.fromPhone,
      isAudio: msg.kind === "audio",
      audioInput,
    });
  }
}

type GenerateAndSendReplyArgs = {
  clientId: string;
  fromPhone: string;
  isAudio: boolean;
  audioInput: { data: Buffer; mimeType: string } | null;
  /**
   * When set, the trailing consecutive `user` turns in the history are
   * collapsed into a single synthetic turn with this text. Used by the
   * 4s buffer path so Gemini sees "one utterance" instead of N fragments.
   */
  overrideLastUserText?: string;
};

// Single place that reads history, runs Gemini, sends on WA, logs the reply.
// Reused by the immediate path (buffer OFF, or audio / first msg of a thread)
// and the buffered path (WA_BUFFER_ENABLED=true), which aggregates consecutive
// text messages before calling this.
async function generateAndSendReply(
  supabase: SupabaseClient,
  args: GenerateAndSendReplyArgs,
): Promise<void> {
  const { clientId, fromPhone, isAudio, audioInput, overrideLastUserText } = args;

  const { data: history } = await supabase
    .from("wa_conversations")
    .select("role, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(50);

  // If the buffer path gave us an aggregated text, replace the trailing
  // consecutive `user` rows (which are the just-inserted fragments) with
  // a single synthetic user turn — so Gemini sees one utterance.
  const historyForLlm = (history ?? []).map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content as string,
  }));
  if (overrideLastUserText && historyForLlm.length > 0) {
    let i = historyForLlm.length;
    while (i > 0 && historyForLlm[i - 1].role === "user") i--;
    historyForLlm.splice(i, historyForLlm.length - i, {
      role: "user",
      content: overrideLastUserText,
    });
  }

  const docs = await getActiveBotDocuments();

  // Enrichment: se il cliente è già nel DB (non è il placeholder
  // "Nuovo Contatto WA"), carichiamo il suo contesto (profilo +
  // appuntamenti futuri/passati + vouchers + programmi) e lo iniettiamo
  // nel systemInstruction così Marialucia può personalizzare la risposta.
  const clientCtx = await getClientContextForBot(clientId);
  const clientContextText = await buildClientContextPrompt(clientCtx);

  const rawReply = await generateReply({
    history: historyForLlm,
    apiKey: process.env.GEMINI_API_KEY!,
    documents: docs.map((d) => ({ titolo: d.titolo, contenuto: d.contenuto })),
    clientContext: clientContextText,
    ...(audioInput ? { audioInput } : {}),
  });
  if (!rawReply) return;

  // If the audio was unclear, Gemini returns the AUDIO_UNCLEAR sentinel
  // (sometimes wrapped in whitespace/backticks). Swap for the hardcoded
  // "please type" fallback.
  const isUnclear = isAudio && /AUDIO_UNCLEAR/i.test(rawReply);
  const reply = isUnclear ? AUDIO_UNCLEAR_REPLY : rawReply;

  try {
    const metaId = await sendWithHumanDelay(fromPhone, reply, {
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
