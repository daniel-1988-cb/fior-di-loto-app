// Tipi e costanti per dynamic_pricing_rules.
// Modulo plain (no "use server"): può esportare const e type liberamente.

export const VALID_ADJUST_TYPES = ["sconto", "maggiorazione"] as const;
export type AdjustType = (typeof VALID_ADJUST_TYPES)[number];

export const VALID_ADJUST_KINDS = ["percentuale", "fisso"] as const;
export type AdjustKind = (typeof VALID_ADJUST_KINDS)[number];

export type PricingRule = {
  id: string;
  nome: string;
  descrizione: string | null;
  adjustType: AdjustType;
  adjustKind: AdjustKind;
  adjustValue: number;
  giorniSettimana: number[]; // 0-6, 0 = domenica
  oraInizio: string | null; // "HH:MM"
  oraFine: string | null;
  serviziTarget: string[]; // service uuid[]
  dataInizio: string | null; // "YYYY-MM-DD"
  dataFine: string | null;
  priorita: number;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PricingRuleInput = {
  nome?: string;
  descrizione?: string | null;
  adjustType?: string;
  adjustKind?: string;
  adjustValue?: number;
  giorniSettimana?: number[];
  oraInizio?: string | null;
  oraFine?: string | null;
  serviziTarget?: string[];
  dataInizio?: string | null;
  dataFine?: string | null;
  priorita?: number;
  attivo?: boolean;
};
