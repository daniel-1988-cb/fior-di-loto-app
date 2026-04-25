export const dynamic = "force-dynamic";

import { getPricingRules } from "@/lib/actions/dynamic-pricing";
import { getServices } from "@/lib/actions/services";
import { TariffeClient, type ServiceLite } from "@/components/marketing/tariffe-client";

type ServiceRow = {
  id: string;
  nome: string;
  categoria: string;
};

export default async function V2TariffeSmartPage() {
  const [rules, servicesRaw] = await Promise.all([
    getPricingRules(false),
    getServices(),
  ]);

  const services: ServiceLite[] = (servicesRaw as ServiceRow[]).map((s) => ({
    id: s.id,
    nome: s.nome,
    categoria: s.categoria,
  }));

  return <TariffeClient rules={rules} services={services} />;
}
