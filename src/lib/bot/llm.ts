import { GoogleGenAI } from "@google/genai";
import { MARIALUCIA_SYSTEM_PROMPT } from "./marialucia-system-prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateReplyOpts = {
  history: ChatTurn[];
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

export async function generateReply(opts: GenerateReplyOpts): Promise<string> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });
  const recent = opts.history.slice(-50);

  // Gemini expects role: "user" | "model"
  const contents = recent.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));

  const res = await client.models.generateContent({
    model: opts.model ?? "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: MARIALUCIA_SYSTEM_PROMPT,
      maxOutputTokens: opts.maxTokens ?? 400,
      temperature: 0.8,
    },
  });

  return res.text ?? "";
}
