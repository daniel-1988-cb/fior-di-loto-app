export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSegmentStats } from "@/lib/actions/client-segments";
import type { TableRow } from "@/types/database";
import SegmentiClient from "./segmenti-client";

export default async function V2SegmentsPage() {
  const supabase = createAdminClient();

  const [{ data: clientsData }, stats] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("totale_speso", { ascending: false, nullsFirst: false })
      .limit(2000),
    getSegmentStats(),
  ]);

  const clients = (clientsData ?? []) as TableRow<"clients">[];

  return <SegmentiClient clients={clients} stats={stats} />;
}
