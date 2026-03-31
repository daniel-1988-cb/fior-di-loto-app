export const dynamic = "force-dynamic";

import { SocialNav } from "@/components/social/social-nav";
import { CompetitorClient } from "@/components/social/competitor-client";
import { getCompetitors } from "@/lib/actions/competitors";

export default async function CompetitorPage() {
  const competitors = await getCompetitors();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Competitor Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitora i competitor del settore estetico
        </p>
      </div>

      <SocialNav />

      <CompetitorClient initialCompetitors={competitors} />
    </div>
  );
}
