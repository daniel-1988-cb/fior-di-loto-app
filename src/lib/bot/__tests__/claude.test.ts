import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  function FakeAnthropic(this: unknown) {
    (this as { messages: unknown }).messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Ciao, sono Marialucia!" }],
      }),
    };
  }
  return { default: FakeAnthropic };
});

describe("generateReply", () => {
  it("returns text from Claude", async () => {
    const { generateReply } = await import("@/lib/bot/claude");
    const reply = await generateReply({
      history: [{ role: "user", content: "Ciao" }],
      apiKey: "sk-ant-test",
    });
    expect(reply).toContain("Marialucia");
  });
});
