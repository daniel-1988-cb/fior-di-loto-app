export const dynamic = "force-dynamic";

import { CalendarGrid } from "@/components/v2/calendar-grid";
import { CalendarToolbar } from "@/components/v2/calendar-toolbar";
import { AggiungiDropdownButton } from "@/components/agenda/aggiungi-dropdown-button";
import { getAppointmentsMultiStaff } from "@/lib/actions/appointments";
import { getStaff } from "@/lib/actions/staff";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function V2AgendaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date ?? today;

  const [staff, appointments] = await Promise.all([
    getStaff(true),
    getAppointmentsMultiStaff(date),
  ]);

  return (
    <>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.length} membri del team · {appointments.length} appuntamenti
          </p>
        </div>
        <AggiungiDropdownButton currentDate={date} />
      </header>

      <CalendarToolbar currentDate={date} />

      <CalendarGrid
        date={date}
        staff={staff.map((s) => ({
          id: s.id,
          nome: s.nome,
          cognome: s.cognome,
          colore: s.colore,
          avatar_url: s.avatar_url,
        }))}
        appointments={appointments}
      />
    </>
  );
}
