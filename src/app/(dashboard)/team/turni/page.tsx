export const dynamic = "force-dynamic";

import { teamSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Avatar, Badge } from "@/components/ui";
import { getStaff } from "@/lib/actions/staff";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default async function V2TurniPage() {
  const staff = await getStaff(true);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Turni programmati</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anteprima settimana corrente — orario standard per giorno.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3 text-left font-medium">Membro</th>
                  {WEEKDAYS.map((d) => (
                    <th key={d} className="pb-3 text-center font-medium">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map((s) => {
                  const giorniSet = new Set(s.giorni_lavoro ?? []);
                  return (
                    <tr key={s.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${s.nome} ${s.cognome ?? ""}`}
                            size="sm"
                            color={s.colore}
                          />
                          <span className="font-medium">{s.nome}</span>
                        </div>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 0].map((day, i) => {
                        const active = giorniSet.has(day);
                        return (
                          <td key={i} className="py-3 text-center">
                            {active ? (
                              <div
                                className="inline-flex flex-col items-center rounded-md border px-2 py-1 text-[11px] font-medium"
                                style={{
                                  borderColor: s.colore,
                                  backgroundColor: `${s.colore}1a`,
                                }}
                              >
                                <span>{s.orario_inizio?.slice(0, 5)}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {s.orario_fine?.slice(0, 5)}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline">—</Badge>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
