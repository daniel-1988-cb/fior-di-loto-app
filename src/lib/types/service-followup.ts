// Tipi per il sistema di follow-up automatici per servizio.
// Le regole vivono in service_followup_rules; gli invii in appointment_followups_sent.

export type FollowUpRule = {
  id: string;
  serviceId: string | null; // null = default globale
  offsetHours: number;
  messageTemplate: string;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
};

// Gli unici offset esposti in UI. -24h è gestito dal cron reminders esistente.
export const FOLLOWUP_OFFSETS = [-12, 12, 24] as const;
export type FollowUpOffset = (typeof FOLLOWUP_OFFSETS)[number];

export type FollowUpJob = {
  appointmentId: string;
  ruleId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  waOptIn: boolean;
  serviceName: string;
  appointmentDateTime: string; // ISO Europe/Rome
  message: string;
  // Campi extra per template Meta (cron sceglie free-form vs template
  // outside-session usando questi). offsetHours è la regola di follow-up
  // applicata; firstName/appointmentTime sono i parametri del template.
  offsetHours: number;
  firstName: string;
  appointmentTime: string; // "HH:MM" Europe/Rome
};
