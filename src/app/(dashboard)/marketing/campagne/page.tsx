export const dynamic = "force-dynamic";

import { getCampaigns } from "@/lib/actions/campaigns";
import { CampagneClient } from "./campagne-client";

export default async function V2CampagnePage() {
  const campaigns = await getCampaigns();
  return <CampagneClient campaigns={campaigns} />;
}
