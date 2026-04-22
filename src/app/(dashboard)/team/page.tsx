export const dynamic = "force-dynamic";

import Link from "next/link";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import {
  CalendarDays,
  Clock,
  Plus,
  TrendingUp,
  Umbrella,
  UserCircle2,
  Users,
} from "lucide-react";
import { getStaff } from "@/lib/actions/staff";
import { getTurniByWeek } from "@/lib/actions/staff-turni";
import {
  getPresenzeByStaffMonth,
  type MonthlySummary,
} from "@/lib/actions/staff-presenze";
import { getFerieRichieste } from "@/lib/actions/staff-ferie";
import { createAdminClient } from "@/lib/supabase/admin";

function startOfWeekISO(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay();
  const shift = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + shift);
  return copy.toISOString().slice(0, 10);
}

function startEndCurrentMonth(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    end: `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

type StaffMetric = {
  appuntamenti: number;
  clientiUnici: number;
  fatturato: number;
  mediaPerCliente: number;
  oreLavorate: number;
};

async function loadStaffMetrics(
  staffIds: string[],
): Promise<Record<string, StaffMetric>> {
  const supabase = createAdminClient();
  const { start, end } = startEndCurrentMonth();

  const [apptsRes, itemsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("staff_id, client_id, stato")
      .gte("data", start)
      .lte("data", end)
      .neq("stato", "cancellato")
      .in("staff_id", staffIds.length > 0 ? staffIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("transaction_items")
      .select("staff_id, unit_price, quantity, created_at")
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`)
      .in("staff_id", staffIds.length > 0 ? staffIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const metrics: Record<string, StaffMetric> = {};
  for (const id of staffIds) {
    metrics[id] = {
      appuntamenti: 0,
      clientiUnici: 0,
      fatturato: 0,
      mediaPerCliente: 0,
      oreLavorate: 0,
    };
  }

  const clientSets: Record<string, Set<string>> = {};
  for (const row of (apptsRes.data || []) as Array<{
    staff_id: string | null;
    client_id: string | null;
  }>) {
    if (!row.staff_id) continue;
    const m = metrics[row.staff_id];
    if (!m) continue;
    m.appuntamenti += 1;
    if (row.client_id) {
      (clientSets[row.staff_id] ??= new Set()).add(row.client_id);
    }
  }
  for (const id of staffIds) {
    metrics[id].clientiUnici = clientSets[id]?.size ?? 0;
  }

  for (const row of (itemsRes.data || []) as Array<{
    staff_id: string | null;
    unit_price: number | string;
    quantity: number | string | null;
  }>) {
    if (!row.staff_id) continue;
    const m = metrics[row.staff_id];
    if (!m) continue;
    const price = Number(row.unit_price) || 0;
    const qty = Number(row.quantity ?? 1) || 0;
    m.fatturato += price * qty;
  }

  for (const id of staffIds) {
    const m = metrics[id];
    m.mediaPerCliente = m.clientiUnici > 0 ? m.fatturato / m.clientiUnici : 0;
  }

  return metrics;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
          {sub && (
            <p className="text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function V2TeamPage() {
  const staff = await getStaff();
  const activeStaff = staff.filter((s) => s.attiva);

  const weekStart = startOfWeekISO(new Date());
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [turniWeek, ferieAll, presenzeAll, metrics] = await Promise.all([
    getTurniByWeek(weekStart),
    getFerieRichieste("pending"),
    Promise.all(
      activeStaff.map((s) =>
        getPresenzeByStaffMonth(s.id, year, month).catch(
          () => null as MonthlySummary | null,
        ),
      ),
    ),
    loadStaffMetrics(activeStaff.map((s) => s.id)),
  ]);

  const oreMese = presenzeAll.reduce(
    (sum, m) => sum + (m?.oreTotali ?? 0),
    0,
  );
  const oreMesePerStaff: Record<string, number> = {};
  activeStaff.forEach((s, i) => {
    oreMesePerStaff[s.id] = presenzeAll[i]?.oreTotali ?? 0;
  });

  const fmtEur = (n: number) =>
    n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panoramica team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance del mese · {activeStaff.length} membri attivi.
          </p>
        </div>
        <Link href="/impostazioni/staff/nuovo">
          <Button>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        </Link>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Staff attivi"
          value={activeStaff.length}
          sub={`${staff.length} totali`}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Turni settimana"
          value={turniWeek.length}
          sub="programmati"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Ore mese"
          value={`${oreMese.toFixed(1)} h`}
          sub="cumulate da clock in/out"
        />
        <StatCard
          icon={<Umbrella className="h-5 w-5" />}
          label="Ferie in attesa"
          value={ferieAll.length}
          sub={ferieAll.length === 0 ? "nessuna richiesta" : "da approvare"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Performance per membro</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeStaff.length === 0 ? (
            <Card className="col-span-full p-6 text-center text-sm text-muted-foreground">
              Nessun membro attivo.
            </Card>
          ) : (
            activeStaff.map((s) => {
              const m = metrics[s.id];
              const oreMese = oreMesePerStaff[s.id] ?? 0;
              return (
                <Card key={s.id} className="p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <Avatar
                      name={`${s.nome} ${s.cognome ?? ""}`}
                      src={s.avatar_url}
                      size="lg"
                      color={s.colore}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {s.nome} {s.cognome ?? ""}
                      </p>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {s.ruolo}
                      </Badge>
                    </div>
                    <Link
                      href={`/impostazioni/staff/${s.id}`}
                      className="text-muted-foreground hover:text-foreground"
                      title="Profilo staff"
                    >
                      <UserCircle2 className="h-5 w-5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Appuntamenti
                      </p>
                      <p className="font-semibold tabular-nums">
                        {m.appuntamenti}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Clienti unici
                      </p>
                      <p className="font-semibold tabular-nums">
                        {m.clientiUnici}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Fatturato
                      </p>
                      <p className="font-semibold tabular-nums">
                        {fmtEur(m.fatturato)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Media €/cliente
                      </p>
                      <p className="font-semibold tabular-nums">
                        {fmtEur(m.mediaPerCliente)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {oreMese.toFixed(1)} h
                      lavorate
                    </span>
                    {s.obiettivo_mensile > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />{" "}
                        {Math.round(
                          (m.fatturato / Number(s.obiettivo_mensile)) * 100,
                        )}
                        % obiettivo
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
