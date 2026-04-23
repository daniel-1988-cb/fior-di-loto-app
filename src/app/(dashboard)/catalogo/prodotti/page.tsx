export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { ProdottiClient } from "./prodotti-client";

type Product = {
  id: string;
  nome: string;
  categoria: string | null;
  descrizione: string | null;
  prezzo: number;
  giacenza: number;
  soglia_alert: number | null;
  image_url: string | null;
  attivo: boolean;
};

export default async function V2ProdottiPage() {
  // Carica tutti i prodotti inclusi inattivi per visibilità completa
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("id, nome, categoria, descrizione, prezzo, giacenza, soglia_alert, image_url, attivo")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  const products: Product[] = (data ?? []).map((p) => ({
    ...p,
    prezzo: typeof p.prezzo === "string" ? Number(p.prezzo) : p.prezzo,
  }));

  return <ProdottiClient products={products} />;
}
