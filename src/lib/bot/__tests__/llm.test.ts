import { describe, it, expect, vi } from "vitest";

const mockResponse = vi.hoisted(() => ({
  value: {
    text: "Ciao, sono Marialucia!",
    candidates: [{ finishReason: "STOP" }],
  } as unknown,
}));

vi.mock("@google/genai", () => {
  function FakeGoogleGenAI(this: unknown) {
    (this as { models: unknown }).models = {
      generateContent: vi.fn().mockImplementation(async () => mockResponse.value),
    };
  }
  return { GoogleGenAI: FakeGoogleGenAI };
});

describe("generateReply (Gemini)", () => {
  it("returns text + metadata on normal completion", async () => {
    mockResponse.value = {
      text: "Ciao, sono Marialucia!",
      candidates: [{ finishReason: "STOP" }],
    };
    const { generateReply } = await import("@/lib/bot/llm");
    const result = await generateReply({
      history: [{ role: "user", content: "Ciao" }],
      apiKey: "AIzaSy-test",
    });
    expect(result.text).toContain("Marialucia");
    expect(result.finishReason).toBe("STOP");
    expect(result.safetyBlocked).toBe(false);
  });

  it("flags safetyBlocked when finishReason=SAFETY and returns empty text", async () => {
    mockResponse.value = {
      text: undefined,
      candidates: [{ finishReason: "SAFETY" }],
    };
    const { generateReply } = await import("@/lib/bot/llm");
    const result = await generateReply({
      history: [{ role: "user", content: "cellulite menopausa" }],
      apiKey: "AIzaSy-test",
    });
    expect(result.text).toBe("");
    expect(result.safetyBlocked).toBe(true);
    expect(result.finishReason).toBe("SAFETY");
  });
});
