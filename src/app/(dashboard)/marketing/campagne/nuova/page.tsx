export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { NuovaCampagnaClient } from "./nuova-client";

const SEGMENTS = ["lead", "nuova", "lotina", "inattiva", "vip"] as const;

export default async function V2NuovaCampagnaPage() {
  const supabase = createAdminClient();

  const [totalRes, ...segRes] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    ...SEGMENTS.map((seg) =>
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("segmento", seg)
    ),
  ]);

  const segmentCounts = SEGMENTS.map((segmento, i) => ({
    segmento,
    count: segRes[i].count ?? 0,
  }));

  return (
    <NuovaCampagnaClient
      totalClients={totalRes.count ?? 0}
      segmentCounts={segmentCounts}
    />
  );
}
