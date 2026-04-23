export const dynamic = "force-dynamic";

import { getAutomations } from "@/lib/actions/marketing-automations";
import { AutomaticiClient } from "./automatici-client";

export default async function V2AutomaticiPage() {
  const automations = await getAutomations();
  return <AutomaticiClient automations={automations} />;
}
