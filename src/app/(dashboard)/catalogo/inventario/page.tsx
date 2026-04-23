export const dynamic = "force-dynamic";

import { getInventoryOverview } from "@/lib/actions/inventario";
import { InventarioClient } from "./inventario-client";

export default async function V2InventarioPage() {
  const rows = await getInventoryOverview();
  return <InventarioClient rows={rows} />;
}
