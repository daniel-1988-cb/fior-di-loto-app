"use server";

// Companion helpers per gestione voucher lato catalogo (non tocca vouchers.ts
// che è stable). Aggiunge solo operazioni catalog-side mancanti.

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

export async function updateVoucherCatalog(
  id: string,
  data: {
    descrizione?: string | null;
    dataScadenza?: string | null;
    valore?: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };

  const updates: Record<string, unknown> = {};
  if (data.descrizione !== undefined) {
    updates.descrizione = data.descrizione
      ? truncate(sanitizeString(data.descrizione), 1000)
      : null;
  }
  if (data.dataScadenza !== undefined) {
    updates.data_scadenza = data.dataScadenza || null;
  }
  if (data.valore !== undefined) {
    if (typeof data.valore !== "number" || data.valore <= 0) {
      return { ok: false, error: "Valore non valido" };
    }
    updates.valore = data.valore;
  }

  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("vouchers")
    .update(updates)
    .eq("id", id)
    .eq("usato", false);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getVoucherById(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vouchers")
    .select("*, services(nome), products(nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
