"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

export type Staff = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  colore: string;
  attiva: boolean;
  orario_inizio: string;
  orario_fine: string;
  giorni_lavoro: number[];
  obiettivo_mensile: number;
  telefono: string | null;
  email: string | null;
  note: string | null;
  avatar_url: string | null;
};

export type StaffFerie = {
  id: string;
  staff_id: string;
  data_inizio: string;
  data_fine: string;
  tipo: string;
  note: string | null;
  created_at: string;
};

export async function getStaff(soloAttivi = false): Promise<Staff[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("staff")
    .select("*")
    .order("nome", { ascending: true });

  if (soloAttivi) {
    query = query.eq("attiva", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Staff[];
}

export async function getStaffMember(id: string): Promise<Staff> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Staff;
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const allowed: Record<string, unknown> = {};
  if (data.nome !== undefined) allowed.nome = String(data.nome).trim().slice(0, 100);
  if (data.cognome !== undefined) allowed.cognome = String(data.cognome).trim().slice(0, 100);
  if (data.ruolo !== undefined) {
    const validRuoli = ["titolare", "operatrice", "receptionist", "manager"];
    if (!validRuoli.includes(data.ruolo)) throw new Error("Ruolo non valido");
    allowed.ruolo = data.ruolo;
  }
  if (data.colore !== undefined) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(data.colore)) throw new Error("Colore non valido");
    allowed.colore = data.colore;
  }
  if (data.attiva !== undefined) allowed.attiva = Boolean(data.attiva);
  if (data.orario_inizio !== undefined) {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(data.orario_inizio)) throw new Error("Orario inizio non valido");
    allowed.orario_inizio = data.orario_inizio;
  }
  if (data.orario_fine !== undefined) {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(data.orario_fine)) throw new Error("Orario fine non valido");
    allowed.orario_fine = data.orario_fine;
  }
  if (data.giorni_lavoro !== undefined) {
    if (!Array.isArray(data.giorni_lavoro)) throw new Error("Giorni lavoro non validi");
    allowed.giorni_lavoro = data.giorni_lavoro.filter((d) => typeof d === "number" && d >= 0 && d <= 6);
  }
  if (data.obiettivo_mensile !== undefined) allowed.obiettivo_mensile = Number(data.obiettivo_mensile);
  if (data.telefono !== undefined) allowed.telefono = data.telefono ? String(data.telefono).trim().slice(0, 30) : null;
  if (data.email !== undefined) allowed.email = data.email ? String(data.email).trim().toLowerCase().slice(0, 255) : null;
  if (data.note !== undefined) allowed.note = data.note ? String(data.note).trim().slice(0, 2000) : null;
  if (data.avatar_url !== undefined) allowed.avatar_url = data.avatar_url || null;
  allowed.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("staff")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Staff;
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  if (!data.nome || !String(data.nome).trim()) throw new Error("Nome obbligatorio");

  const validRuoli = ["titolare", "operatrice", "receptionist", "manager"];
  const ruolo = data.ruolo && validRuoli.includes(data.ruolo) ? data.ruolo : "operatrice";
  const colore = data.colore && /^#[0-9A-Fa-f]{6}$/.test(data.colore) ? data.colore : "#e8a4a4";

  const insert: Record<string, unknown> = {
    nome: String(data.nome).trim().slice(0, 100),
    cognome: data.cognome ? String(data.cognome).trim().slice(0, 100) : "",
    ruolo,
    colore,
    attiva: data.attiva !== undefined ? Boolean(data.attiva) : true,
    orario_inizio: data.orario_inizio && /^\d{2}:\d{2}(:\d{2})?$/.test(data.orario_inizio) ? data.orario_inizio : "09:00",
    orario_fine: data.orario_fine && /^\d{2}:\d{2}(:\d{2})?$/.test(data.orario_fine) ? data.orario_fine : "19:00",
    giorni_lavoro: Array.isArray(data.giorni_lavoro) ? data.giorni_lavoro : [1, 2, 3, 4, 5, 6],
    obiettivo_mensile: data.obiettivo_mensile ? Number(data.obiettivo_mensile) : 0,
    telefono: data.telefono ? String(data.telefono).trim().slice(0, 30) : null,
    email: data.email ? String(data.email).trim().toLowerCase().slice(0, 255) : null,
    note: data.note ? String(data.note).trim().slice(0, 2000) : null,
  };

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("staff")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return row as Staff;
}

// ============================================
// AVATAR UPLOAD
// ============================================

export async function uploadStaffAvatar(staffId: string, formData: FormData): Promise<string> {
  if (!isValidUUID(staffId)) throw new Error("ID non valido");
  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) throw new Error("File non trovato");
  if (file.size > 2 * 1024 * 1024) throw new Error("File troppo grande (max 2MB)");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Formato non supportato (usa JPG, PNG o WebP)");

  const supabase = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${staffId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("staff-avatars")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from("staff-avatars").getPublicUrl(path);
  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  await supabase.from("staff").update({ avatar_url: urlWithBust, updated_at: new Date().toISOString() }).eq("id", staffId);
  return urlWithBust;
}

// ============================================
// FERIE
// ============================================

export async function getStaffFerie(staffId?: string): Promise<StaffFerie[]> {
  if (staffId && !isValidUUID(staffId)) throw new Error("ID staff non valido");
  const supabase = createAdminClient();
  let query = supabase
    .from("staff_ferie")
    .select("*")
    .order("data_inizio", { ascending: true });

  if (staffId) {
    query = query.eq("staff_id", staffId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as StaffFerie[];
}

export async function createFerie(data: {
  staff_id: string;
  data_inizio: string;
  data_fine: string;
  tipo: string;
  note?: string;
}): Promise<StaffFerie> {
  if (!isValidUUID(data.staff_id)) throw new Error("ID staff non valido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data_inizio)) throw new Error("Data inizio non valida");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data_fine)) throw new Error("Data fine non valida");

  const validTipi = ["ferie", "permesso", "malattia", "altro"];
  if (!validTipi.includes(data.tipo)) throw new Error("Tipo non valido");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("staff_ferie")
    .insert({
      staff_id: data.staff_id,
      data_inizio: data.data_inizio,
      data_fine: data.data_fine,
      tipo: data.tipo,
      note: data.note ? String(data.note).trim().slice(0, 500) : null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as StaffFerie;
}

export async function deleteFerie(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { error } = await supabase.from("staff_ferie").delete().eq("id", id);
  if (error) throw error;
}
