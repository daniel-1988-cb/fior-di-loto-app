import crypto from "node:crypto";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaMessageId = string;

export type NormalizedMessage = {
  metaMessageId: string;
  fromPhone: string;
  text: string;
  timestamp: number;
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
        if (msg.type !== "text" || !msg.text) continue;
        out.push({
          metaMessageId: msg.id,
          fromPhone: msg.from,
          text: msg.text.body,
          timestamp: Number(msg.timestamp),
        });
      }
    }
  }
  return out;
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
