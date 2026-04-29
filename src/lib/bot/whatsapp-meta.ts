import crypto from "node:crypto";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaMessageId = string;

export type NormalizedMessage = {
  metaMessageId: string;
  fromPhone: string;
  timestamp: number;
  kind: "text" | "audio";
  text?: string;
  audioId?: string;
};

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string,
  expectedToken: string,
): string | null {
  if (mode === "subscribe" && token === expectedToken) return challenge;
  return null;
}

export function verifySignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseInbound(payload: unknown): NormalizedMessage[] {
  const p = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id: string;
            from: string;
            timestamp: string;
            text?: { body: string };
            audio?: { id: string; voice?: boolean };
            voice?: { id: string };
            type?: string;
          }>;
        };
      }>;
    }>;
  };
  const out: NormalizedMessage[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type === "text" && msg.text) {
          out.push({
            metaMessageId: msg.id,
            fromPhone: msg.from,
            timestamp: Number(msg.timestamp),
            kind: "text",
            text: msg.text.body,
          });
          continue;
        }
        // WhatsApp audio/voice: either type="audio" with audio.id (voice=true
        // for push-to-talk vocali) or in rare payloads type="voice" with
        // voice.id. Treat both as audio for Gemini.
        const audioId =
          msg.type === "audio" && msg.audio
            ? msg.audio.id
            : msg.type === "voice" && msg.voice
              ? msg.voice.id
              : undefined;
        if (audioId) {
          out.push({
            metaMessageId: msg.id,
            fromPhone: msg.from,
            timestamp: Number(msg.timestamp),
            kind: "audio",
            audioId,
          });
        }
      }
    }
  }
  return out;
}

export async function downloadMedia(
  mediaId: string,
  opts: { accessToken: string },
): Promise<{ data: Buffer; mimeType: string }> {
  // Step 1: GET /{media-id} -> { url, mime_type, ... }
  const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${opts.accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(
      `Meta media metadata error ${metaRes.status}: ${await metaRes.text()}`,
    );
  }
  const meta = (await metaRes.json()) as { url: string; mime_type: string };

  // Step 2: download from meta.url (CDN Meta, requires same Bearer)
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${opts.accessToken}` },
  });
  if (!fileRes.ok) {
    throw new Error(`Meta media download error ${fileRes.status}`);
  }
  const arr = await fileRes.arrayBuffer();
  return { data: Buffer.from(arr), mimeType: meta.mime_type };
}

export async function sendMessage(
  to: string,
  body: string,
  opts: { phoneNumberId: string; accessToken: string },
): Promise<MetaMessageId> {
  const url = `${GRAPH_BASE}/${opts.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta API error ${res.status}: ${err}`);
  }
  const json = (await res.json()) as { messages: Array<{ id: string }> };
  return json.messages[0].id;
}

export async function sendWithHumanDelay(
  to: string,
  body: string,
  opts: { phoneNumberId: string; accessToken: string; minMs?: number; maxMs?: number },
): Promise<MetaMessageId> {
  const min = opts.minMs ?? 1500;
  const max = opts.maxMs ?? 4500;
  const charDelay = Math.min(max, Math.max(min, body.length * 40));
  await new Promise((r) => setTimeout(r, charDelay));
  return sendMessage(to, body, opts);
}

/**
 * Invia un Message Template approvato via Meta Cloud API.
 *
 * I template servono fuori dalla finestra di customer-care 24h: Meta li
 * obbliga per business-initiated messages. `bodyParams` è la lista
 * ordinata dei placeholder {{1}}, {{2}}, ... del body del template.
 * Se vuota, il payload omette il blocco `components` (template senza
 * variabili).
 *
 * Errori: lancia `Error` con status + body Meta come `sendMessage`.
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  language: string,
  bodyParams: string[],
  opts: { phoneNumberId: string; accessToken: string },
): Promise<MetaMessageId> {
  const url = `${GRAPH_BASE}/${opts.phoneNumberId}/messages`;
  const template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: "body";
      parameters: Array<{ type: "text"; text: string }>;
    }>;
  } = {
    name: templateName,
    language: { code: language },
  };
  if (bodyParams.length > 0) {
    template.components = [
      {
        type: "body",
        parameters: bodyParams.map((p) => ({ type: "text", text: p })),
      },
    ];
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta API error ${res.status}: ${err}`);
  }
  const json = (await res.json()) as { messages: Array<{ id: string }> };
  return json.messages[0].id;
}
