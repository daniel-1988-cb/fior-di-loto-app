"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import { getCurrentUser } from "@/lib/actions/ai-assistant";
import {
  VALID_WALLET_TIPI,
  WALLET_TIPI_POSITIVI,
  type WalletTipo,
  type WalletTransaction,
} from "@/lib/types/client-wallet";

/**
 * Saldo corrente del wallet — derivato dall'ultima transazione (saldo_dopo).
 * Cade su 0 se non esistono righe.
 */
export async function getClientWalletBalance(clientId: string): Promise<number> {
  if (!isValidUUID(clientId)) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_wallet_transactions")
    .select("saldo_dopo")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[client-wallet] getClientWalletBalance error:", error);
    return 0;
  }
  if (!data) return 0;
  return Number((data as { saldo_dopo: number | string }).saldo_dopo) || 0;
}

export async function listClientWalletTransactions(
  clientId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  if (!isValidUUID(clientId)) return [];
  const safeLimit = Math.max(1, Math.min(200, limit));
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_wallet_transactions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    console.error("[client-wallet] listClientWalletTransactions error:", error);
    return [];
  }
  // Cast dei NUMERIC (Postgres) → number JS
  return ((data as Array<Omit<WalletTransaction, "importo" | "saldo_dopo"> & {
    importo: number | string;
    saldo_dopo: number | string;
  }>) || []).map((row) => ({
    ...row,
    importo: Number(row.importo) || 0,
    saldo_dopo: Number(row.saldo_dopo) || 0,
  }));
}

export async function addWalletTransaction(input: {
  clientId: string;
  tipo: string;
  importo: number;
  descrizione?: string | null;
  appointmentId?: string | null;
  transactionId?: string | null;
}): Promise<WalletTransaction> {
  if (!isValidUUID(input.clientId)) throw new Error("ID cliente non valido");
  if (!(VALID_WALLET_TIPI as readonly string[]).includes(input.tipo)) {
    throw new Error("Tipo transazione non valido");
  }
  const tipo = input.tipo as WalletTipo;

  const importoAbs = Math.abs(Number(input.importo));
  if (!Number.isFinite(importoAbs) || importoAbs <= 0) {
    throw new Error("Importo deve essere maggiore di zero");
  }
  // L'aggiustamento può andare in entrambi i sensi: l'utente passa un valore
  // firmato. Per gli altri tipi imponiamo il segno in base al tipo.
  const signedImporto = (() => {
    if (tipo === "aggiustamento") return Number(input.importo);
    return WALLET_TIPI_POSITIVI.includes(tipo) ? importoAbs : -importoAbs;
  })();

  if (input.appointmentId && !isValidUUID(input.appointmentId)) {
    throw new Error("ID appuntamento non valido");
  }
  if (input.transactionId && !isValidUUID(input.transactionId)) {
    throw new Error("ID transazione non valido");
  }

  const descrizione = input.descrizione
    ? truncate(sanitizeString(input.descrizione), 500) || null
    : null;

  const supabase = createAdminClient();

  // Saldo prima
  const current = await getClientWalletBalance(input.clientId);
  const nextBalance = Math.round((current + signedImporto) * 100) / 100;
  if (nextBalance < 0) {
    throw new Error("Saldo insufficiente");
  }

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("client_wallet_transactions")
    .insert({
      client_id: input.clientId,
      tipo,
      importo: signedImporto,
      descrizione,
      saldo_dopo: nextBalance,
      appointment_id: input.appointmentId ?? null,
      transaction_id: input.transactionId ?? null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const row = data as Omit<WalletTransaction, "importo" | "saldo_dopo"> & {
    importo: number | string;
    saldo_dopo: number | string;
  };
  return {
    ...row,
    importo: Number(row.importo) || 0,
    saldo_dopo: Number(row.saldo_dopo) || 0,
  };
}
