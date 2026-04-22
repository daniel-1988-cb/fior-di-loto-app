export const dynamic = "force-dynamic";

import { getStaff } from "@/lib/actions/staff";
import { getTurniByWeek } from "@/lib/actions/staff-turni";
import { TurniPlanner } from "@/components/team/turni-planner";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function startOfWeekISO(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay();
  const shift = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + shift);
  return copy.toISOString().slice(0, 10);
}

export default async function V2TurniPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weekParam = sp.week;
  const weekStart =
    weekParam && DATE_RE.test(weekParam)
      ? weekParam
      : startOfWeekISO(new Date());

  const [staff, turni] = await Promise.all([
    getStaff(true),
    getTurniByWeek(weekStart),
  ]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Turni programmati</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Planner settimanale — clic su una cella per aggiungere o modificare un
          turno.
        </p>
      </header>

      <TurniPlanner
        staff={staff}
        initialTurni={turni}
        initialWeekStart={weekStart}
      />
    </>
  );
}
