import { describe, it, expect, vi } from "vitest";

vi.mock("@google/genai", () => {
  function FakeGoogleGenAI(this: unknown) {
    (this as { models: unknown }).models = {
      generateContent: vi.fn().mockResolvedValue({
        text: "Ciao, sono Marialucia!",
      }),
    };
  }
  return { GoogleGenAI: FakeGoogleGenAI };
});

describe("generateReply (Gemini)", () => {
  it("returns text from Gemini", async () => {
    const { generateReply } = await import("@/lib/bot/llm");
    const reply = await generateReply({
      history: [{ role: "user", content: "Ciao" }],
      apiKey: "AIzaSy-test",
    });
    expect(reply).toContain("Marialucia");
  });
});
