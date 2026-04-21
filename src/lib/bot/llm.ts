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
};

export async function generateReply(opts: GenerateReplyOpts): Promise<string> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });
  const recent = opts.history.slice(-50);

  const docsBlock =
    opts.documents && opts.documents.length > 0
      ? "\n\n---\n\nDOCUMENTI DI RIFERIMENTO AUTOREVOLI (usa queste informazioni quando pertinenti, non inventare):\n\n" +
        opts.documents
          .map((d, i) => `## Documento ${i + 1}: ${d.titolo}\n${d.contenuto}`)
          .join("\n\n")
      : "";

  const systemInstruction = MARIALUCIA_SYSTEM_PROMPT + docsBlock;

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

  const res = await client.models.generateContent({
    model: opts.model ?? "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: opts.maxTokens ?? 600,
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return res.text ?? "";
}
