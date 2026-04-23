export const dynamic = "force-dynamic";

import { getOffers } from "@/lib/actions/offers";
import { OfferteClient } from "./offerte-client";

export default async function V2OfferteMarketingPage() {
  const offers = await getOffers(true);
  return <OfferteClient offers={offers} />;
}
