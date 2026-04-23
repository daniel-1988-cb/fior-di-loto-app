export const dynamic = "force-dynamic";

import { getSuppliers } from "@/lib/actions/suppliers";
import { FornitoriClient } from "@/components/catalogo/fornitori-client";

export default async function V2FornitoriPage() {
  // Carica anche gli inattivi per permettere riattivazione dalla UI
  const suppliers = await getSuppliers(true);
  return <FornitoriClient suppliers={suppliers} />;
}
