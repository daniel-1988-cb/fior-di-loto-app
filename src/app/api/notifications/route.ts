import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listRecentWAFailures,
  listPendingAppointmentRequests,
} from "@/lib/actions/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint usato dal `<NotificationBell />` per popolare il drawer.
 * Richiede sessione autenticata — qualsiasi utente del gestionale è admin.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [failures, pendingRequests] = await Promise.all([
    listRecentWAFailures(),
    listPendingAppointmentRequests(),
  ]);

  return NextResponse.json({ failures, pendingRequests });
}
