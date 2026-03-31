"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "FDL-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getVouchers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vouchers")
    .select(
      "*, destinatario:destinatario_id(nome, cognome), acquistato_da:acquistato_da_id(nome, cognome), services(nome), products(nome)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getVoucherByCode(codice: string) {
  if (!codice || typeof codice !== "string" || codice.trim().length === 0) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vouchers")
    .select("*, services(nome), products(nome)")
    .eq("codice", codice.trim().toUpperCase())
    .eq("usato", false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createVoucher(data: {
  tipo: string;
  valore: number;
  serviceId?: string;
  productId?: string;
  destinatarioId?: string;
  acquistatoDaId?: string;
  descrizione?: string;
  dataScadenza?: string;
}) {
  const VALID_TIPI = ["importo", "servizio", "prodotto"] as const;
  if (!(VALID_TIPI as readonly string[]).includes(data.tipo)) throw new Error("Tipo voucher non valido");
  if (typeof data.valore !== "number" || data.valore <= 0) throw new Error("Valore non valido");
  if (data.serviceId && !isValidUUID(data.serviceId)) throw new Error("ID servizio non valido");
  if (data.productId && !isValidUUID(data.productId)) throw new Error("ID prodotto non valido");
  if (data.destinatarioId && !isValidUUID(data.destinatarioId)) throw new Error("ID destinatario non valido");
  if (data.acquistatoDaId && !isValidUUID(data.acquistatoDaId)) throw new Error("ID acquirente non valido");

  const supabase = createAdminClient();

  // Generate unique code
  let codice = generateVoucherCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("vouchers")
      .select("id")
      .eq("codice", codice)
      .maybeSingle();
    if (!existing) break;
    codice = generateVoucherCode();
    attempts++;
  }

  const { data: row, error } = await supabase
    .from("vouchers")
    .insert({
      codice,
      tipo: data.tipo,
      valore: data.valore,
      service_id: data.serviceId || null,
      product_id: data.productId || null,
      destinatario_id: data.destinatarioId || null,
      acquistato_da_id: data.acquistatoDaId || null,
      descrizione: data.descrizione || null,
      data_scadenza: data.dataScadenza || null,
      usato: false,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function redeemVoucher(id: string, appointmentId: string) {
  if (!isValidUUID(id)) throw new Error("ID voucher non valido");
  if (!isValidUUID(appointmentId)) throw new Error("ID appuntamento non valido");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("vouchers")
    .update({
      usato: true,
      data_uso: new Date().toISOString(),
      appointment_id: appointmentId,
    })
    .eq("id", id)
    .eq("usato", false)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteVoucher(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("vouchers")
    .delete()
    .eq("id", id)
    .eq("usato", false);
  if (error) throw error;
}
