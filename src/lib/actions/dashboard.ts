"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type DayData = {
  giorno: string; // "Lun", "Mar", ecc.
  data: string;   // "YYYY-MM-DD"
  vendite: number;
  appuntamenti: number;
};

export async function getDashboardChartData(): Promise<DayData[]> {
  const supabase = createAdminClient();

  // Last 7 days
  const days: DayData[] = [];
  const shortDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      giorno: shortDays[d.getDay()],
      data: dateStr,
      vendite: 0,
      appuntamenti: 0,
    });
  }

  const from = days[0].data;
  const to = days[days.length - 1].data;

  const [{ data: txRows }, { data: aptRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("data, importo")
      .eq("tipo", "entrata")
      .gte("data", from)
      .lte("data", to),
    supabase
      .from("appointments")
      .select("data, stato")
      .gte("data", from)
      .lte("data", to)
      .neq("stato", "cancellato"),
  ]);

  for (const tx of txRows || []) {
    const day = days.find((d) => d.data === tx.data);
    if (day) day.vendite += Number(tx.importo || 0);
  }
  for (const apt of aptRows || []) {
    const dateStr = String(apt.data).slice(0, 10);
    const day = days.find((d) => d.data === dateStr);
    if (day) day.appuntamenti += 1;
  }

  return days;
}
