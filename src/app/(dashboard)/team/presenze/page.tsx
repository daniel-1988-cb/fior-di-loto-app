export const dynamic = "force-dynamic";

import { getStaff } from "@/lib/actions/staff";
import {
  getCurrentPresenza,
  getPresenzeByStaffMonth,
  type MonthlySummary,
} from "@/lib/actions/staff-presenze";
import {
  PresenzeTimesheet,
  type PresenzaCurrent,
} from "@/components/team/presenze-timesheet";

function parseYearMonth(
  sp: { year?: string; month?: string },
): { year: number; month: number } {
  const now = new Date();
  const y = Number(sp.year);
  const m = Number(sp.month);
  const year =
    Number.isInteger(y) && y >= 2020 && y <= 2100 ? y : now.getFullYear();
  const month =
    Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  return { year, month };
}

export default async function V2PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const { year, month } = parseYearMonth(sp);

  const staff = await getStaff(true);

  const [currents, summaries] = await Promise.all([
    Promise.all(staff.map((s) => getCurrentPresenza(s.id))),
    Promise.all(
      staff.map((s) => getPresenzeByStaffMonth(s.id, year, month)),
    ),
  ]);

  const current: Record<string, PresenzaCurrent> = {};
  const monthly: Record<string, MonthlySummary> = {};
  staff.forEach((s, i) => {
    const cur = currents[i];
    current[s.id] = cur
      ? { staffId: cur.staffId, clockIn: cur.clockIn }
      : null;
    monthly[s.id] = summaries[i];
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Fogli di presenza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clock in/out staff e riepilogo ore lavorate mensile.
        </p>
      </header>

      <PresenzeTimesheet
        staff={staff}
        current={current}
        monthly={monthly}
        year={year}
        month={month}
      />
    </>
  );
}
