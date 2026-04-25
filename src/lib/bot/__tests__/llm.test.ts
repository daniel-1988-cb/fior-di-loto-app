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

  it("falls back to candidates[0].content.parts when top-level text is empty", async () => {
    // Real-world case on gemini-2.5-* with thinking nominally off: the SDK
    // sometimes leaves `result.text` empty even though the visible reply is
    // sitting in `candidates[0].content.parts[*].text`. We must extract it.
    mockResponse.value = {
      text: "",
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { text: "thinking...", thought: true }, // hidden, must be filtered
              { text: "ciao!! 😊 dimmi" },
            ],
          },
        },
      ],
    };
    const { generateReply } = await import("@/lib/bot/llm");
    const result = await generateReply({
      history: [{ role: "user", content: "ciao" }],
      apiKey: "AIzaSy-test",
    });
    expect(result.text).toBe("ciao!! 😊 dimmi");
    expect(result.errorKind).toBeUndefined();
    expect(result.finishReason).toBe("STOP");
  });

  it("preserves MAX_TOKENS finishReason so the webhook can escalate", async () => {
    mockResponse.value = {
      text: "",
      candidates: [{ finishReason: "MAX_TOKENS" }],
    };
    const { generateReply } = await import("@/lib/bot/llm");
    const result = await generateReply({
      history: [{ role: "user", content: "ciao" }],
      apiKey: "AIzaSy-test",
    });
    expect(result.text).toBe("");
    expect(result.finishReason).toBe("MAX_TOKENS");
    expect(result.safetyBlocked).toBe(false);
  });
});
