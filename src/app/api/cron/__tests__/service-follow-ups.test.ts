import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/bot/whatsapp-meta", () => ({
  sendMessage: vi.fn(async () => "wamid.MOCK"),
}));

const insertCalls: Array<Record<string, unknown>> = [];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertCalls.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

const dueFollowUpsMock = vi.fn();
vi.mock("@/lib/actions/service-followups", () => ({
  getDueFollowUps: (now: Date) => dueFollowUpsMock(now),
}));

import { GET } from "@/app/api/cron/service-follow-ups/route";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

beforeEach(() => {
  insertCalls.length = 0;
  vi.mocked(sendMessage).mockClear();
  dueFollowUpsMock.mockReset();
  process.env.CRON_SECRET = "test-secret";
  process.env.META_WA_PHONE_NUMBER_ID = "pid";
  process.env.META_WA_ACCESS_TOKEN = "tok";
  // Disable jitter delay to keep tests fast
  process.env.WA_REMINDER_DELAY_MIN_MS = "0";
  process.env.WA_REMINDER_DELAY_MAX_MS = "1";
});

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/service-follow-ups", {
    headers,
  });
}

describe("/api/cron/service-follow-ups", () => {
  it("rejects without bearer token", async () => {
    dueFollowUpsMock.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("rejects with wrong bearer token", async () => {
    dueFollowUpsMock.mockResolvedValue([]);
    const res = await GET(makeReq({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns ok summary with zero candidates", async () => {
    dueFollowUpsMock.mockResolvedValue([]);
    const res = await GET(
      makeReq({ authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.candidates).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("sends WA + records sent row for each candidate", async () => {
    dueFollowUpsMock.mockResolvedValue([
      {
        appointmentId: "a-1",
        ruleId: "r-1",
        clientId: "c-1",
        clientName: "Maria",
        clientPhone: "393331112222",
        waOptIn: true,
        serviceName: "Pressoterapia",
        appointmentDateTime: "2026-04-27T13:30:00.000Z",
        message: "Maria 🌸 ciao",
      },
    ]);
    const res = await GET(
      makeReq({ authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      "393331112222",
      "Maria 🌸 ciao",
      expect.objectContaining({ phoneNumberId: "pid", accessToken: "tok" }),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      appointment_id: "a-1",
      rule_id: "r-1",
      status: "sent",
      channel: "whatsapp",
    });
  });

  it("records failed rows when sendMessage throws", async () => {
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error("Meta 400 boom"));
    dueFollowUpsMock.mockResolvedValue([
      {
        appointmentId: "a-2",
        ruleId: "r-2",
        clientId: "c-2",
        clientName: "Sara",
        clientPhone: "393334445555",
        waOptIn: true,
        serviceName: "Massaggio",
        appointmentDateTime: "2026-04-27T13:30:00.000Z",
        message: "msg",
      },
    ]);
    const res = await GET(
      makeReq({ authorization: "Bearer test-secret" }),
    );
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({ status: "failed" });
  });
});
