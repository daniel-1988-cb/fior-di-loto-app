"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AppuntamentoDomani = {
  id: string;
  ora: string; // "HH:MM"
  cliente_nome: string;
  cliente_cognome: string;
  cliente_telefono: string | null;
  servizio_nome: string;
  operatrice: string | null;
};

export async function getAppuntamentiDomani(): Promise<AppuntamentoDomani[]> {
  const supabase = createAdminClient();

  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  const dataStr = domani.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select("id, ora, clients(nome, cognome, telefono), services(nome), staff(nome)")
    .eq("data", dataStr)
    .neq("stato", "cancellato")
    .order("ora", { ascending: true });

  if (error || !data) return [];

  return data.map((a: any) => ({
    id: a.id,
    ora: a.ora ? String(a.ora).slice(0, 5) : "",
    cliente_nome: a.clients?.nome || "",
    cliente_cognome: a.clients?.cognome || "",
    cliente_telefono: a.clients?.telefono || null,
    servizio_nome: a.services?.nome || "",
    operatrice: a.staff?.nome || null,
  }));
}
