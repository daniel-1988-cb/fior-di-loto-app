"use server";

import { createClient } from "@/lib/supabase/server";

export type AppointmentRequestStato = "pending_review" | "scheduled" | "rejected";

export type AppointmentRequestListItem = {
 id: string;
 clientId: string;
 clientName: string;
 clientPhone: string | null;
 testoRichiesta: string;
 stato: AppointmentRequestStato;
 noteOperatore: string | null;
 appointmentId: string | null;
 createdAt: string;
 processedAt: string | null;
};

export async function getAppointmentRequests(
 stato?: AppointmentRequestStato,
): Promise<AppointmentRequestListItem[]> {
 const supabase = await createClient();
 let q = supabase
  .from("appointment_requests")
  .select(
   "id, client_id, testo_richiesta, stato, note_operatore, appointment_id, created_at, processed_at",
  )
  .order("created_at", { ascending: false })
  .limit(200);
 if (stato) q = q.eq("stato", stato);
 const { data: rows } = await q;
 if (!rows || rows.length === 0) return [];

 const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
 const { data: clients } = await supabase
  .from("clients")
  .select("id, nome, cognome, telefono")
  .in("id", clientIds);
 const byId = new Map((clients ?? []).map((c) => [c.id, c]));

 return rows.map((r) => {
  const c = byId.get(r.client_id);
  return {
   id: r.id,
   clientId: r.client_id,
   clientName: c ? `${c.nome ?? ""} ${c.cognome ?? ""}`.trim() || "Sconosciuto" : "Sconosciuto",
   clientPhone: c?.telefono ?? null,
   testoRichiesta: r.testo_richiesta,
   stato: r.stato as AppointmentRequestStato,
   noteOperatore: r.note_operatore,
   appointmentId: r.appointment_id,
   createdAt: r.created_at,
   processedAt: r.processed_at,
  };
 });
}

export async function getPendingAppointmentRequestsCount(): Promise<number> {
 const supabase = await createClient();
 const { count } = await supabase
  .from("appointment_requests")
  .select("id", { count: "exact", head: true })
  .eq("stato", "pending_review");
 return count ?? 0;
}

export async function updateAppointmentRequestStatus(
 id: string,
 stato: AppointmentRequestStato,
 opts?: { appointmentId?: string | null; noteOperatore?: string | null },
): Promise<{ ok: boolean; error?: string }> {
 if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "id non valido" };
 const supabase = await createClient();
 const updates: Record<string, unknown> = {
  stato,
  processed_at: stato === "pending_review" ? null : new Date().toISOString(),
 };
 if (opts?.appointmentId !== undefined) updates.appointment_id = opts.appointmentId;
 if (opts?.noteOperatore !== undefined) updates.note_operatore = opts.noteOperatore;
 const { error } = await supabase.from("appointment_requests").update(updates).eq("id", id);
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}
