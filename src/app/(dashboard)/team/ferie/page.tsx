export const dynamic = "force-dynamic";

import { getStaff } from "@/lib/actions/staff";
import {
  getFerieRichieste,
  type FerieStato,
} from "@/lib/actions/staff-ferie";
import { FerieClient } from "./ferie-client";

const VALID_STATI: Array<FerieStato | "all"> = [
  "pending",
  "approved",
  "rejected",
  "all",
];

export default async function V2FeriePage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const sp = await searchParams;
  const rawStato = (sp.stato ?? "pending") as FerieStato | "all";
  const stato: FerieStato | "all" = VALID_STATI.includes(rawStato)
    ? rawStato
    : "pending";

  const [staff, ferie] = await Promise.all([
    getStaff(),
    getFerieRichieste(stato),
  ]);

  const pendingCount =
    stato === "pending"
      ? ferie.length
      : (await getFerieRichieste("pending")).length;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ferie e permessi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingCount} richiest{pendingCount === 1 ? "a" : "e"} in attesa ·
          workflow approvazione
        </p>
      </header>

      <FerieClient staff={staff} initialFerie={ferie} initialStato={stato} />
    </>
  );
}
