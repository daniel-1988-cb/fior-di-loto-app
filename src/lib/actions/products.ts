"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import { sendPushToAll } from "@/lib/actions/push";

// ============================================
// READ OPERATIONS
// ============================================

export async function getProduct(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProducts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("attivo", true)
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data || []).map((product) => ({
    ...product,
    low_stock: product.giacenza <= (product.soglia_alert ?? 5),
  }));
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createProduct(data: {
  nome: string;
  categoria: string;
  descrizione?: string;
  prezzo: number;
  giacenza: number;
  sogliaAlert?: number;
}) {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (!data.categoria || typeof data.categoria !== "string" || data.categoria.trim().length === 0) {
    throw new Error("Categoria obbligatoria");
  }
  if (typeof data.prezzo !== "number" || data.prezzo < 0) throw new Error("Prezzo non valido");
  if (!Number.isInteger(data.giacenza) || data.giacenza < 0) throw new Error("Giacenza non valida");

  const nome = truncate(sanitizeString(data.nome), 200);
  const categoria = truncate(sanitizeString(data.categoria), 100);
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;
  const sogliaAlert = data.sogliaAlert ?? 5;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("products")
    .insert({ nome, categoria, descrizione, prezzo: data.prezzo, giacenza: data.giacenza, soglia_alert: sogliaAlert, attivo: true })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateProduct(id: string, data: {
  nome?: string;
  categoria?: string;
  descrizione?: string;
  prezzo?: number;
  giacenza?: number;
  sogliaAlert?: number;
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (data.prezzo !== undefined && (typeof data.prezzo !== "number" || data.prezzo < 0)) throw new Error("Prezzo non valido");
  if (data.giacenza !== undefined && (!Number.isInteger(data.giacenza) || data.giacenza < 0)) throw new Error("Giacenza non valida");

  const updates: Record<string, unknown> = {};
  if (data.nome) updates.nome = truncate(sanitizeString(data.nome), 200);
  if (data.categoria) updates.categoria = truncate(sanitizeString(data.categoria), 100);
  if (data.descrizione !== undefined) updates.descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;
  if (data.prezzo !== undefined) updates.prezzo = data.prezzo;
  if (data.giacenza !== undefined) updates.giacenza = data.giacenza;
  if (data.sogliaAlert !== undefined) updates.soglia_alert = data.sogliaAlert;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

// ============================================
// IMAGE UPLOAD (Supabase Storage)
// ============================================

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<string> {
  if (!isValidUUID(productId)) throw new Error("ID non valido");
  const file = formData.get("image") as File;
  if (!file || file.size === 0) throw new Error("File non trovato");
  if (file.size > 4 * 1024 * 1024) throw new Error("File troppo grande (max 4MB)");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Formato non supportato (usa JPG, PNG o WebP)");
  }

  const supabase = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${productId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);
  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  const { error: dbErr } = await supabase
    .from("products")
    .update({ image_url: urlWithBust })
    .eq("id", productId);
  if (dbErr) throw dbErr;

  return urlWithBust;
}

export async function deleteProductImage(productId: string): Promise<void> {
  if (!isValidUUID(productId)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  // Proviamo a rimuovere tutti gli ext possibili (best-effort)
  await supabase.storage
    .from("product-images")
    .remove([`${productId}.jpg`, `${productId}.png`, `${productId}.webp`]);

  const { error } = await supabase
    .from("products")
    .update({ image_url: null })
    .eq("id", productId);
  if (error) throw error;
}

export async function updateGiacenza(id: string, delta: number) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!Number.isInteger(delta)) throw new Error("Delta non valido");

  const supabase = createAdminClient();

  // Fetch current state — serve giacenza per il calcolo, soglia/nome/attivo
  // per il push di threshold-crossing dopo l'update.
  const { data: current, error: fetchError } = await supabase
    .from("products")
    .select("giacenza, soglia_alert, nome, attivo")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const before = current.giacenza ?? 0;
  const after = Math.max(0, before + delta);
  const soglia = current.soglia_alert as number | null;
  const nome = current.nome as string;
  const attivo = current.attivo as boolean;

  const { data: row, error } = await supabase
    .from("products")
    .update({ giacenza: after })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Push notification se l'update ha fatto attraversare la soglia di alert.
  // Solo su decremento (delta < 0) e solo se prodotto attivo + soglia configurata.
  // Caso "out": era > 0, ora = 0 → 🔴 esaurito
  // Caso "low": era > soglia, ora <= soglia (e > 0) → 🟡 in esaurimento
  // Best-effort: errori del push non bloccano l'update giacenza.
  if (attivo && delta < 0 && soglia !== null) {
    const crossedOut = before > 0 && after === 0;
    const crossedLow = before > soglia && after <= soglia && after > 0;
    if (crossedOut || crossedLow) {
      try {
        await sendPushToAll({
          title: crossedOut ? "Prodotto esaurito 📦" : "Prodotto in esaurimento 📦",
          body: crossedOut
            ? `${nome} è esaurito — riordina al fornitore`
            : `${nome}: solo ${after} pezzi rimasti (soglia ${soglia})`,
          url: "/?notifications=open",
          tag: `stock-${id}`,
        });
      } catch (e) {
        console.error(
          "[updateGiacenza] push notification threw:",
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  return row;
}
