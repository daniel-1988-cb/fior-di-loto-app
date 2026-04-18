export const dynamic = "force-dynamic";

import { teamSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Avatar, Badge } from "@/components/ui";
import { Plus } from "lucide-react";
import { getStaff } from "@/lib/actions/staff";

export default async function V2TeamPage() {
  const staff = await getStaff();

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membri del team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.length} membri · {staff.filter((s) => s.attiva).length} attivi.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Membro</th>
                <th className="px-4 py-3 text-left font-medium">Ruolo</th>
                <th className="px-4 py-3 text-left font-medium">Contatti</th>
                <th className="px-4 py-3 text-left font-medium">Orario</th>
                <th className="px-4 py-3 text-center font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nessun membro del team.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${s.nome} ${s.cognome ?? ""}`}
                          src={s.avatar_url}
                          size="md"
                          color={s.colore}
                        />
                        <div>
                          <p className="font-medium">
                            {s.nome} {s.cognome ?? ""}
                          </p>
                          {s.obiettivo_mensile ? (
                            <p className="text-xs text-muted-foreground">
                              Obiettivo € {s.obiettivo_mensile.toLocaleString("it-IT")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {s.ruolo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{s.email ?? "—"}</div>
                      <div>{s.telefono ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.orario_inizio?.slice(0, 5)} - {s.orario_fine?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={s.attiva ? "success" : "default"}>
                        {s.attiva ? "Attiva" : "Inattiva"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
