export const dynamic = "force-dynamic";

import { CalendarGrid } from "@/components/v2/calendar-grid";
import { CalendarToolbar } from "@/components/v2/calendar-toolbar";
import { getAppointmentsMultiStaff } from "@/lib/actions/appointments";
import { getStaff } from "@/lib/actions/staff";
import { getBlockedSlotsByDate } from "@/lib/actions/blocked-slots";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function V2AgendaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date ?? today;

  const [staff, appointments, blockedSlots] = await Promise.all([
    getStaff(true),
    getAppointmentsMultiStaff(date),
    getBlockedSlotsByDate(date),
  ]);

  return (
    <>
      <CalendarToolbar
        currentDate={date}
        staffCount={staff.length}
        appointmentsCount={appointments.length}
      />

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
        blockedSlots={blockedSlots.map((b) => ({
          id: b.id,
          staffId: b.staffId,
          oraInizio: b.oraInizio,
          oraFine: b.oraFine,
          tipo: b.tipo,
          titolo: b.titolo,
        }))}
      />
    </>
  );
}
