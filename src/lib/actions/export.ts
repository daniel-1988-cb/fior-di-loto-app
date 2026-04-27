"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row: Record<string, unknown>, headers: string[]): string {
  return headers.map((h) => escapeCSV(row[h])).join(",");
}

function buildCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const header = headers.join(",");
  const body = rows.map((r) => rowToCSV(r, headers)).join("\n");
  return `${header}\n${body}`;
}

// ─── Clienti ────────────────────────────────────────────────────────────────

export async function exportClientiCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,nome,cognome,telefono,email,data_nascita,segmento,fonte,indirizzo,note,totale_visite,totale_speso,ultima_visita,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Errore export clienti: ${error.message}`);

  const headers = [
    "id","nome","cognome","telefono","email","data_nascita","segmento",
    "fonte","indirizzo","note","totale_visite","totale_speso","ultima_visita","created_at",
  ];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}

// ─── Interazioni ─────────────────────────────────────────────────────────────

export async function exportInterazioniCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_interactions")
    .select("id,client_id,tipo,descrizione,importo,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Errore export interazioni: ${error.message}`);

  const headers = ["id", "client_id", "tipo", "descrizione", "importo", "created_at"];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}

// ─── Appuntamenti ────────────────────────────────────────────────────────────

export async function exportAppuntamentiCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id,client_id,service_id,data,ora_inizio,ora_fine,stato,note,created_at")
    .order("data", { ascending: false });
  if (error) throw new Error(`Errore export appuntamenti: ${error.message}`);

  const headers = [
    "id","client_id","service_id","data","ora_inizio","ora_fine","stato","note","created_at",
  ];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}

// ─── Transazioni ─────────────────────────────────────────────────────────────

export async function exportTransazioniCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,tipo,categoria,descrizione,importo,metodo_pagamento,data,client_id,created_at")
    .order("data", { ascending: false });
  if (error) throw new Error(`Errore export transazioni: ${error.message}`);

  const headers = [
    "id","tipo","categoria","descrizione","importo","metodo_pagamento","data","client_id","created_at",
  ];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}

// ─── Prodotti ────────────────────────────────────────────────────────────────

export async function exportProdottiCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,nome,descrizione,prezzo,categoria,giacenza,attivo,created_at")
    .order("nome", { ascending: true });
  if (error) throw new Error(`Errore export prodotti: ${error.message}`);

  const headers = ["id","nome","descrizione","prezzo","categoria","giacenza","attivo","created_at"];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}

// ─── Servizi ─────────────────────────────────────────────────────────────────

export async function exportServiziCSV(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("id,nome,descrizione,durata,prezzo,categoria,attivo,created_at")
    .order("nome", { ascending: true });
  if (error) throw new Error(`Errore export servizi: ${error.message}`);

  const headers = ["id","nome","descrizione","durata","prezzo","categoria","attivo","created_at"];
  return buildCSV((data || []) as Record<string, unknown>[], headers);
}
