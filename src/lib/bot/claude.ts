import Anthropic from "@anthropic-ai/sdk";
import { MARIALUCIA_SYSTEM_PROMPT } from "./marialucia-system-prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateReplyOpts = {
  history: ChatTurn[];
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

export async function generateReply(opts: GenerateReplyOpts): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const recent = opts.history.slice(-50);
  const res = await client.messages.create({
    model: opts.model ?? "claude-sonnet-4-6",
    max_tokens: opts.maxTokens ?? 400,
    system: MARIALUCIA_SYSTEM_PROMPT,
    messages: recent.map((t) => ({ role: t.role, content: t.content })),
  });
  const first = res.content[0];
  if (first.type !== "text") return "";
  return first.text;
}
