import { describe, it, expect } from "vitest";
import {
  buildReminderJobs,
  renderWhatsAppReminderBody,
  type AppuntamentoDomaniReminder,
} from "@/lib/reminders/jobs";
import { renderAppointmentReminder } from "@/lib/email/templates/appointment-reminder";

const row = (over: Partial<AppuntamentoDomaniReminder> = {}): AppuntamentoDomaniReminder => ({
  id: "appt-1",
  data: "2026-04-23",
  ora: "15:30",
  cliente_id: "client-1",
  cliente_nome: "Maria",
  cliente_cognome: "Rossi",
  cliente_telefono: "393331112222",
  cliente_email: "maria@example.com",
  wa_opt_in: true,
  servizio_nome: "Pressoterapia",
  reminder_sent_at: null,
  ...over,
});

describe("buildReminderJobs", () => {
  it("enqueues both channels when everything is present", () => {
    const [job] = buildReminderJobs([row()]);
    expect(job.wa).toEqual({ phone: "393331112222" });
    expect(job.email).toEqual({ to: "maria@example.com" });
    expect(job.clientName).toBe("Maria Rossi");
    expect(job.serviceName).toBe("Pressoterapia");
    expect(job.time).toBe("15:30");
    // Italian locale, Europe/Rome — 2026-04-23 is a Thursday
    expect(job.dateHuman.toLowerCase()).toContain("giovedì");
    expect(job.dateHuman).toContain("2026");
  });

  it("skips WhatsApp when opt-in is false", () => {
    const [job] = buildReminderJobs([row({ wa_opt_in: false })]);
    expect(job.wa).toBeNull();
    expect(job.email).not.toBeNull();
  });

  it("skips WhatsApp when telefono missing", () => {
    const [job] = buildReminderJobs([row({ cliente_telefono: null })]);
    expect(job.wa).toBeNull();
  });

  it("skips email when cliente_email missing", () => {
    const [job] = buildReminderJobs([row({ cliente_email: null })]);
    expect(job.email).toBeNull();
  });

  it("produces zero-channel job when neither is available (cron will flag+skip)", () => {
    const [job] = buildReminderJobs([
      row({ wa_opt_in: false, cliente_telefono: null, cliente_email: null }),
    ]);
    expect(job.wa).toBeNull();
    expect(job.email).toBeNull();
  });

  it("falls back to 'cliente' when the name is empty", () => {
    const [job] = buildReminderJobs([
      row({ cliente_nome: "", cliente_cognome: "" }),
    ]);
    expect(job.clientName).toBe("cliente");
  });
});

describe("renderWhatsAppReminderBody", () => {
  it("contains the essentials in Italian", () => {
    const [job] = buildReminderJobs([row()]);
    const body = renderWhatsAppReminderBody(job);
    expect(body).toContain("Maria");
    expect(body).toContain("Pressoterapia");
    expect(body).toContain("15:30");
    expect(body).toContain("Fior di Loto");
  });

  it("uses only the first name (warm WhatsApp tone)", () => {
    const [job] = buildReminderJobs([row()]);
    const body = renderWhatsAppReminderBody(job);
    expect(body).toContain("Ciao Maria");
    expect(body).not.toContain("Maria Rossi");
  });

  it("falls back to the full name when it's a single token", () => {
    const [job] = buildReminderJobs([row({ cliente_cognome: "" })]);
    const body = renderWhatsAppReminderBody(job);
    expect(body).toContain("Ciao Maria");
  });
});

describe("renderAppointmentReminder template", () => {
  it("returns non-empty subject/html/text", () => {
    const out = renderAppointmentReminder({
      clientName: "Maria",
      serviceName: "Pressoterapia",
      date: "giovedì 23 aprile 2026",
      time: "15:30",
    });
    expect(out.subject.length).toBeGreaterThan(0);
    expect(out.html).toContain("Maria");
    expect(out.text).toContain("Pressoterapia");
    expect(out.subject).toContain("Promemoria");
  });
});
