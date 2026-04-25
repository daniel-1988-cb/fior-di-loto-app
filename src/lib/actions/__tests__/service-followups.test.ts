/**
 * Smoke test per getDueFollowUps. Mocka il supabase admin client con un fake
 * in-memory che ritorna risposte programmate per le 3 query usate
 * (regole attive → appointments nel range → invii già fatti). Verifichiamo
 * che il candidato "buono" venga prodotto come FollowUpJob.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const APPT_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_ID = "33333333-3333-4333-8333-333333333333";
const RULE_ID = "44444444-4444-4444-8444-444444444444";

type Resp = { data: unknown; error: unknown };

const responses: Record<string, Resp> = {};

function makeQuery(table: string) {
  // Ritorna un thenable che usa la response programmata per la "scena" data.
  // La scena attiva è scelta dal table + dalla prossima chiamata che fa il caller.
  let scene: string | null = null;
  // Predispone scene per ogni table
  if (table === "service_followup_rules") scene = "rules";
  if (table === "appointments") scene = "appointments";
  if (table === "appointment_followups_sent") scene = "sent";

  const builder: Record<string, unknown> = {};

  // Tutti i metodi ritornano `builder` per chaining, finché non si fa await.
  const passthrough = () => builder;
  builder.select = passthrough;
  builder.eq = passthrough;
  builder.in = passthrough;
  builder.is = passthrough;
  builder.or = passthrough;
  builder.gte = passthrough;
  builder.lte = passthrough;
  builder.order = passthrough;
  builder.maybeSingle = () =>
    Promise.resolve(responses[`${scene}.maybeSingle`] ?? { data: null, error: null });

  // Bare await: ritorna la response programmata per la scena
  builder.then = (
    onFulfilled: (v: Resp) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => {
    const r = responses[scene ?? ""] ?? { data: [], error: null };
    return Promise.resolve(r).then(onFulfilled, onRejected);
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => makeQuery(table),
  }),
}));

import { getDueFollowUps } from "@/lib/actions/service-followups";

beforeEach(() => {
  for (const k of Object.keys(responses)) delete responses[k];
});

describe("getDueFollowUps", () => {
  it("returns empty when no rules are active", async () => {
    responses["rules"] = { data: [], error: null };
    const out = await getDueFollowUps(new Date("2026-04-27T10:00:00Z"));
    expect(out).toEqual([]);
  });

  it("produces a FollowUpJob for an appointment in the trigger window with a service-specific rule", async () => {
    // now = 2026-04-27 09:00 UTC = 11:00 Rome
    // Regola: -12h → trigger = appt - 12h. Quindi appt = now + 12h = 2026-04-27 21:00 UTC.
    // In Rome: 23:00 (CEST UTC+2)
    const now = new Date("2026-04-27T09:00:00Z");

    responses["rules"] = {
      data: [
        {
          id: RULE_ID,
          service_id: SERVICE_ID,
          offset_hours: -12,
          message_template: "Ciao {nome} 🌸 domani alle {ora} per {servizio}",
          attivo: true,
          created_at: "2026-04-26T00:00:00Z",
          updated_at: "2026-04-26T00:00:00Z",
        },
      ],
      error: null,
    };

    responses["appointments"] = {
      data: [
        {
          id: APPT_ID,
          data: "2026-04-27",
          // 23:00 Rome (CEST = UTC+2 in summer 2026, post DST 29 mar)
          ora_inizio: "23:00",
          client_id: CLIENT_ID,
          servizio_id: SERVICE_ID,
          servizio_nome: "Pressoterapia",
          stato: "confermato",
          clients: {
            nome: "Maria",
            cognome: "Rossi",
            telefono: "393331112222",
            wa_opt_in: true,
          },
          services: { nome: "Pressoterapia" },
        },
      ],
      error: null,
    };

    responses["sent"] = { data: [], error: null };

    const out = await getDueFollowUps(now);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      appointmentId: APPT_ID,
      ruleId: RULE_ID,
      clientId: CLIENT_ID,
      clientPhone: "393331112222",
      waOptIn: true,
      serviceName: "Pressoterapia",
    });
    expect(out[0].clientName).toBe("Maria Rossi");
    expect(out[0].message).toContain("Maria");
    expect(out[0].message).toContain("Pressoterapia");
    expect(out[0].message).toContain("23:00");
  });

  it("filters out clients without wa_opt_in", async () => {
    const now = new Date("2026-04-27T09:00:00Z");
    responses["rules"] = {
      data: [
        {
          id: RULE_ID,
          service_id: null,
          offset_hours: -12,
          message_template: "Ciao {nome}",
          attivo: true,
          created_at: "2026-04-26T00:00:00Z",
          updated_at: "2026-04-26T00:00:00Z",
        },
      ],
      error: null,
    };
    responses["appointments"] = {
      data: [
        {
          id: APPT_ID,
          data: "2026-04-27",
          ora_inizio: "23:00",
          client_id: CLIENT_ID,
          servizio_id: SERVICE_ID,
          servizio_nome: "Pressoterapia",
          stato: "confermato",
          clients: {
            nome: "Maria",
            cognome: "Rossi",
            telefono: "393331112222",
            wa_opt_in: false, // <-- esclusa
          },
          services: { nome: "Pressoterapia" },
        },
      ],
      error: null,
    };
    responses["sent"] = { data: [], error: null };

    const out = await getDueFollowUps(now);
    expect(out).toEqual([]);
  });

  it("dedupes appointments already in appointment_followups_sent", async () => {
    const now = new Date("2026-04-27T09:00:00Z");
    responses["rules"] = {
      data: [
        {
          id: RULE_ID,
          service_id: null,
          offset_hours: -12,
          message_template: "Ciao {nome}",
          attivo: true,
          created_at: "2026-04-26T00:00:00Z",
          updated_at: "2026-04-26T00:00:00Z",
        },
      ],
      error: null,
    };
    responses["appointments"] = {
      data: [
        {
          id: APPT_ID,
          data: "2026-04-27",
          ora_inizio: "23:00",
          client_id: CLIENT_ID,
          servizio_id: SERVICE_ID,
          servizio_nome: "Pressoterapia",
          stato: "confermato",
          clients: {
            nome: "Maria",
            cognome: "Rossi",
            telefono: "393331112222",
            wa_opt_in: true,
          },
          services: { nome: "Pressoterapia" },
        },
      ],
      error: null,
    };
    // Già inviato
    responses["sent"] = {
      data: [{ appointment_id: APPT_ID, rule_id: RULE_ID }],
      error: null,
    };

    const out = await getDueFollowUps(now);
    expect(out).toEqual([]);
  });
});
