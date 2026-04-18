export const dynamic = "force-dynamic";

import { teamSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Avatar, Badge } from "@/components/ui";
import { Plus } from "lucide-react";
import { getStaff, getStaffFerie } from "@/lib/actions/staff";

export default async function V2FeriePage() {
  const [staff, ferie] = await Promise.all([getStaff(), getStaffFerie()]);
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const todayStr = new Date().toISOString().slice(0, 10);
  const future = ferie.filter((f) => f.data_fine >= todayStr);
  const past = ferie.filter((f) => f.data_fine < todayStr);

  const renderList = (rows: typeof ferie) =>
    rows.map((f) => {
      const s = staffById.get(f.staff_id);
      return (
        <li key={f.id} className="flex items-center gap-3 py-3">
          {s && (
            <Avatar
              name={`${s.nome} ${s.cognome ?? ""}`}
              size="sm"
              color={s.colore}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {s?.nome ?? "—"}{" "}
              <span className="text-muted-foreground">· {f.tipo}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(f.data_inizio).toLocaleDateString("it-IT")} →{" "}
              {new Date(f.data_fine).toLocaleDateString("it-IT")}
            </p>
            {f.note && <p className="mt-0.5 text-xs italic text-muted-foreground">{f.note}</p>}
          </div>
          <Badge variant="outline" className="capitalize">
            {f.tipo}
          </Badge>
        </li>
      );
    });

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ferie e permessi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {future.length} in programma · {past.length} archiviate.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Nuova ferie
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold">In programma</h2>
          {future.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nessuna ferie prevista.
            </p>
          ) : (
            <ul className="divide-y divide-border">{renderList(future)}</ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold">Storico</h2>
          {past.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nessuno storico.</p>
          ) : (
            <ul className="divide-y divide-border">{renderList(past.slice(0, 12))}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
