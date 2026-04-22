export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { ServiziClient } from "./servizi-client";

type Service = {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string | null;
  durata: number;
  prezzo: number;
  attivo: boolean;
};

export default async function V2CatalogoServiziPage() {
  // Carica tutti i servizi (incluso inattivi) per permettere riattivazione
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("services")
    .select("id, nome, categoria, descrizione, durata, prezzo, attivo")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  const services: Service[] = (data ?? []).map((s) => ({
    ...s,
    prezzo: typeof s.prezzo === "string" ? Number(s.prezzo) : s.prezzo,
  }));

  return <ServiziClient services={services} />;
}
