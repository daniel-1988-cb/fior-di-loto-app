import { GoogleGenAI } from "@google/genai";
import { MARIALUCIA_SYSTEM_PROMPT } from "./marialucia-system-prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateReplyOpts = {
  history: ChatTurn[];
  apiKey: string;
  model?: string;
  maxTokens?: number;
  audioInput?: { data: Buffer; mimeType: string };
  documents?: Array<{ titolo: string; contenuto: string }>;
  clientContext?: string;
};

export type LlmErrorKind =
  | "api_key_invalid"
  | "quota_exceeded"
  | "model_unavailable"
  | "rate_limit"
  | "network"
  | "safety"
  | "empty"
  | "unknown";

export type GenerateReplyResult = {
  text: string;
  finishReason: string | null;
  safetyBlocked: boolean;
  /** Kind di errore, presente solo se text è vuoto o chiamata fallita. */
  errorKind?: LlmErrorKind;
  errorMessage?: string;
  raw?: unknown;
};

function classifyLlmError(e: unknown): { kind: LlmErrorKind; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (lower.includes("api key") && (lower.includes("invalid") || lower.includes("not valid"))) {
    return { kind: "api_key_invalid", message: msg };
  }
  if (lower.includes("quota") || lower.includes("resource_exhausted")) {
    return { kind: "quota_exceeded", message: msg };
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return { kind: "rate_limit", message: msg };
  }
  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("overloaded")) {
    return { kind: "model_unavailable", message: msg };
  }
  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("econn")) {
    return { kind: "network", message: msg };
  }
  return { kind: "unknown", message: msg };
}

export async function generateReply(opts: GenerateReplyOpts): Promise<GenerateReplyResult> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });
  const recent = opts.history.slice(-50);

  const docsBlock =
    opts.documents && opts.documents.length > 0
      ? "\n\n---\n\nDOCUMENTI DI RIFERIMENTO AUTOREVOLI (usa queste informazioni quando pertinenti, non inventare):\n\n" +
        opts.documents
          .map((d, i) => `## Documento ${i + 1}: ${d.titolo}\n${d.contenuto}`)
          .join("\n\n")
      : "";

  const clientBlock = opts.clientContext
    ? "\n\n---\n\n" + opts.clientContext
    : "";

  const systemInstruction = MARIALUCIA_SYSTEM_PROMPT + clientBlock + docsBlock;

  // Gemini expects role: "user" | "model"
  const contents: Array<{
    role: "user" | "model";
    parts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    >;
  }> = recent.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));

  if (opts.audioInput) {
    // Append a final user turn with the audio blob + instruction to
    // transcribe mentally and reply. AUDIO_UNCLEAR is the sentinel we use
    // upstream to fall back to "please type instead".
    contents.push({
      role: "user",
      parts: [
        {
          text: "Il cliente ti ha mandato questo audio WhatsApp. Trascrivilo mentalmente, poi rispondi in testo alla sua domanda seguendo il tuo system prompt. IMPORTANTE: se l'audio è muto, troppo basso, incomprensibile o non contiene parlato, rispondi ESATTAMENTE con la stringa `AUDIO_UNCLEAR` e nient'altro.",
        },
        {
          inlineData: {
            data: opts.audioInput.data.toString("base64"),
            mimeType: opts.audioInput.mimeType,
          },
        },
      ],
    });
  }

  let res: unknown;
  try {
    res = await client.models.generateContent({
      // gemini-2.5-flash-lite has thinking OFF by default → no risk of MAX_TOKENS
      // being eaten by internal thoughts before we get any visible output.
      model: opts.model ?? "gemini-2.5-flash-lite",
      contents,
      config: {
        systemInstruction,
        // Bumped from 600 → 2000: even with thinking nominally off, gemini-2.5
        // can still emit a few hidden "thought" tokens, and 600 was tight
        // enough that some replies finished as MAX_TOKENS with empty text.
        maxOutputTokens: opts.maxTokens ?? 2000,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (e) {
    const { kind, message } = classifyLlmError(e);
    return {
      text: "",
      finishReason: null,
      safetyBlocked: false,
      errorKind: kind,
      errorMessage: message,
    };
  }

  const rawAny = res as unknown as {
    text?: string;
    candidates?: Array<{
      finishReason?: string;
      safetyRatings?: Array<{ blocked?: boolean; probability?: string }>;
      content?: {
        parts?: Array<{ text?: string; thought?: boolean }>;
      };
    }>;
  };
  const candidate = rawAny.candidates?.[0];
  const finishReason = candidate?.finishReason ?? null;
  const safetyBlocked =
    finishReason === "SAFETY" ||
    finishReason === "RECITATION" ||
    (candidate?.safetyRatings?.some((r) => r.blocked === true) ?? false);

  // Prefer the SDK convenience getter `result.text`, but fall back to
  // joining the visible (non-thought) parts ourselves. On gemini-2.5-* the
  // top-level `.text` is sometimes empty even when `candidates[0].content.parts`
  // contains the actual reply — typically when thinking parts are mixed in.
  const partsText = (candidate?.content?.parts ?? [])
    .filter((p) => p && p.thought !== true && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
  const text = rawAny.text && rawAny.text.length > 0 ? rawAny.text : partsText;

  // MAX_TOKENS with empty text is a real outage (config bug, not user's fault) —
  // distinguish from the generic "empty" case so the webhook can escalate.
  const errorKind: LlmErrorKind | undefined = text
    ? undefined
    : safetyBlocked
      ? "safety"
      : finishReason === "MAX_TOKENS"
        ? "empty"
        : "empty";

  return {
    text,
    finishReason,
    safetyBlocked,
    errorKind,
    raw: res,
  };
}
