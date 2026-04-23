export const dynamic = "force-dynamic";

import { getPurchaseOrders } from "@/lib/actions/purchase-orders";
import { getSuppliers } from "@/lib/actions/suppliers";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrdiniClient } from "@/components/catalogo/ordini-client";

export default async function V2OrdiniStockPage() {
  const [orders, suppliers, productsRes] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    createAdminClient()
      .from("products")
      .select("id, nome, prezzo")
      .eq("attivo", true)
      .order("nome", { ascending: true }),
  ]);

  const products = (productsRes.data ?? []).map((p) => ({
    id: p.id as string,
    nome: p.nome as string,
    prezzo:
      typeof p.prezzo === "string" ? Number(p.prezzo) : (p.prezzo as number),
  }));

  return (
    <OrdiniClient
      orders={orders}
      suppliers={suppliers.map((s) => ({ id: s.id, nome: s.nome }))}
      products={products}
    />
  );
}
