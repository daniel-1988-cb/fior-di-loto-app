import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhook, verifySignature, parseInbound } from "@/lib/bot/whatsapp-meta";

describe("verifyWebhook", () => {
  it("returns challenge when mode+token match", () => {
    expect(verifyWebhook("subscribe", "secret-token", "12345", "secret-token")).toBe("12345");
  });
  it("returns null when mode wrong", () => {
    expect(verifyWebhook("unsubscribe", "secret-token", "12345", "secret-token")).toBeNull();
  });
  it("returns null when token mismatch", () => {
    expect(verifyWebhook("subscribe", "wrong", "12345", "secret-token")).toBeNull();
  });
});

describe("verifySignature", () => {
  it("accepts valid HMAC", () => {
    const secret = "app-secret";
    const body = '{"test":1}';
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifySignature(body, expected, secret)).toBe(true);
  });
  it("rejects invalid HMAC", () => {
    expect(verifySignature('{"test":1}', "sha256=0000", "app-secret")).toBe(false);
  });
});

describe("parseInbound", () => {
  it("extracts text messages", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: "wamid.1", from: "393331234567", timestamp: "1700000000", type: "text", text: { body: "Ciao" } },
                  { id: "wamid.2", from: "393331234567", timestamp: "1700000010", type: "image" },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = parseInbound(payload);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("Ciao");
    expect(result[0].fromPhone).toBe("393331234567");
  });
});
