export const dynamic = "force-dynamic";

import { getSubscriptions } from "@/lib/actions/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { AbbonamentiClient } from "./abbonamenti-client";

type ServiceOption = { id: string; nome: string; categoria: string };

export default async function V2AbbonamentiCatalogoPage() {
  const [subscriptions, services] = await Promise.all([
    getSubscriptions(true), // include inactive for admin view
    (async (): Promise<ServiceOption[]> => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("services")
        .select("id, nome, categoria")
        .eq("attivo", true)
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });
      return (data ?? []) as ServiceOption[];
    })(),
  ]);

  return (
    <AbbonamentiClient subscriptions={subscriptions} services={services} />
  );
}
