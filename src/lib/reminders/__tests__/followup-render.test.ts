import { describe, it, expect } from "vitest";
import { renderFollowUpMessage } from "@/lib/reminders/followup-render";

describe("renderFollowUpMessage", () => {
  it("replaces {nome} with the first token of the name", () => {
    const out = renderFollowUpMessage("Ciao {nome} 🌸", {
      firstName: "Maria Rossi",
      serviceName: "Pressoterapia",
      appointmentDateTime: new Date("2026-04-27T15:30:00+02:00"),
      now: new Date("2026-04-27T09:00:00+02:00"),
    });
    expect(out).toBe("Ciao Maria 🌸");
  });

  it("replaces {servizio} {ora} {salone}", () => {
    const out = renderFollowUpMessage(
      "{nome} alle {ora} per {servizio} da {salone}",
      {
        firstName: "Sara",
        serviceName: "Massaggio drenante",
        // 15:30 Rome time
        appointmentDateTime: new Date("2026-04-28T13:30:00Z"),
        now: new Date("2026-04-27T19:00:00+02:00"),
      },
    );
    expect(out).toBe("Sara alle 15:30 per Massaggio drenante da Fior di Loto");
  });

  it("uses 'oggi' when appointment is within 12h", () => {
    // appt 6h from now
    const now = new Date("2026-04-27T09:00:00+02:00");
    const appt = new Date("2026-04-27T15:00:00+02:00");
    const out = renderFollowUpMessage("{data} alle {ora}", {
      firstName: "Anna",
      serviceName: "X",
      appointmentDateTime: appt,
      now,
    });
    expect(out).toBe("oggi alle 15:00");
  });

  it("uses 'domani' when appointment is between 12h and 36h ahead", () => {
    const now = new Date("2026-04-27T09:00:00+02:00");
    // 24h from now
    const appt = new Date("2026-04-28T09:00:00+02:00");
    const out = renderFollowUpMessage("{data}", {
      firstName: "Anna",
      serviceName: "X",
      appointmentDateTime: appt,
      now,
    });
    expect(out).toBe("domani");
  });

  it("falls back to 'il DD/MM' for distant or past appointments", () => {
    const now = new Date("2026-04-27T09:00:00+02:00");
    // 3 giorni dopo
    const appt = new Date("2026-04-30T10:00:00+02:00");
    const out = renderFollowUpMessage("{data}", {
      firstName: "Anna",
      serviceName: "X",
      appointmentDateTime: appt,
      now,
    });
    expect(out).toBe("il 30/04");
  });

  it("leaves unknown placeholders untouched and replaces multiple occurrences", () => {
    const out = renderFollowUpMessage("{nome} {nome} {boh}", {
      firstName: "Lia",
      serviceName: "X",
      appointmentDateTime: new Date("2026-04-27T15:00:00+02:00"),
      now: new Date("2026-04-27T09:00:00+02:00"),
    });
    expect(out).toBe("Lia Lia {boh}");
  });

  it("falls back to 'il trattamento' when serviceName is empty", () => {
    const out = renderFollowUpMessage("Per {servizio}", {
      firstName: "Lia",
      serviceName: "",
      appointmentDateTime: new Date("2026-04-27T15:00:00+02:00"),
      now: new Date("2026-04-27T09:00:00+02:00"),
    });
    expect(out).toBe("Per il trattamento");
  });
});
