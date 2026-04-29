// Registry dei Meta Message Templates approvati per il bot Marialucia.
//
// I template servono fuori dalla finestra customer-care 24h: Meta li
// obbliga per business-initiated messages. I 4 template attivi (PENDING /
// approvati lato Meta) sono:
//
//   - fdl_reminder_giorno_prima  → cron /api/cron/reminders (day-before, 17:00)
//   - fdl_reminder_sera_prima    → cron /api/cron/service-follow-ups (offset -12h)
//   - fdl_followup_12h           → cron /api/cron/service-follow-ups (offset +12h)
//   - fdl_followup_24h           → cron /api/cron/service-follow-ups (offset +24h)
//
// L'attivazione è dietro feature flag `WA_TEMPLATES_ENABLED` per non
// rompere il flusso free-form attuale finché i template non sono APPROVED.

import type { ReminderJob } from "@/lib/reminders/jobs";

export type WATemplateSpec = {
  name: string;
  language: string;
  bodyParams: string[];
};

export function templateForDayBeforeReminder(job: ReminderJob): WATemplateSpec {
  const firstName = job.clientName.split(" ")[0] || job.clientName;
  return {
    name: "fdl_reminder_giorno_prima",
    language: "it",
    bodyParams: [firstName, job.serviceName, job.dateHuman, job.time],
  };
}

export function templateForFollowUp(opts: {
  offsetHours: number;
  firstName: string;
  serviceName: string;
  time: string; // "HH:MM"
}): WATemplateSpec | null {
  const { offsetHours, firstName, serviceName, time } = opts;
  if (offsetHours === -12) {
    return {
      name: "fdl_reminder_sera_prima",
      language: "it",
      bodyParams: [firstName, time, serviceName],
    };
  }
  if (offsetHours === 12) {
    return {
      name: "fdl_followup_12h",
      language: "it",
      bodyParams: [firstName],
    };
  }
  if (offsetHours === 24) {
    return {
      name: "fdl_followup_24h",
      language: "it",
      bodyParams: [firstName],
    };
  }
  return null;
}

export function isTemplatesEnabled(): boolean {
  return process.env.WA_TEMPLATES_ENABLED === "true";
}
