export type WalletTransaction = {
  id: string;
  client_id: string;
  tipo: string;
  importo: number;
  descrizione: string | null;
  saldo_dopo: number;
  appointment_id: string | null;
  transaction_id: string | null;
  created_by: string | null;
  created_at: string;
};

export const VALID_WALLET_TIPI = [
  "ricarica",
  "utilizzo",
  "rimborso",
  "aggiustamento",
] as const;

export type WalletTipo = (typeof VALID_WALLET_TIPI)[number];

export const WALLET_TIPO_LABEL: Record<WalletTipo, string> = {
  ricarica: "Ricarica",
  utilizzo: "Utilizzo",
  rimborso: "Rimborso",
  aggiustamento: "Aggiustamento",
};

/** Tipi che aumentano il saldo (segno positivo). */
export const WALLET_TIPI_POSITIVI: ReadonlyArray<WalletTipo> = [
  "ricarica",
  "rimborso",
];
