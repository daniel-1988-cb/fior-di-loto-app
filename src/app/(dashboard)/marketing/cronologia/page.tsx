export const dynamic = "force-dynamic";

import { Card, Badge } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

type SearchParams = { canale?: string; days?: string };

const CHANNELS = ["whatsapp", "email", "sms"] as const;
const DAYS_OPTIONS = ["7", "30", "90", "365"] as const;

export default async function V2CronologiaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const canale = sp.canale && (CHANNELS as readonly string[]).includes(sp.canale) ? sp.canale : null;
  const daysRaw = sp.days && (DAYS_OPTIONS as readonly string[]).includes(sp.days) ? sp.days : "30";
  const days = parseInt(daysRaw, 10);

  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const supabase = createAdminClient();
  let q = supabase
    .from("sent_messages")
    .select("*, clients(nome, cognome), message_templates(nome)")
    .gte("inviato_at", since)
    .order("inviato_at", { ascending: false })
    .limit(500);
  if (canale) q = q.eq("canale", canale);

  const { data } = await q;
  const rows = data ?? [];

  const sent = rows.filter((r) => r.stato === "inviato").length;
  const errors = rows.filter((r) => r.stato === "errore").length;

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cronologia messaggi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} messaggi negli ultimi {days} giorni · {sent} inviati · {errors} errori
          </p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Canale:</span>
        <FilterLink label="Tutti" href={buildHref({ canale: null, days: daysRaw })} active={!canale} />
        {CHANNELS.map((ch) => (
          <FilterLink
            key={ch}
            label={ch}
            href={buildHref({ canale: ch, days: daysRaw })}
            active={canale === ch}
          />
        ))}
        <span className="ml-4 text-xs uppercase tracking-wider text-muted-foreground">Periodo:</span>
        {DAYS_OPTIONS.map((d) => (
          <FilterLink
            key={d}
            label={`${d} gg`}
            href={buildHref({ canale, days: d })}
            active={daysRaw === d}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Canale</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Contenuto</th>
                <th className="px-4 py-3 text-center font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nessun messaggio nel periodo selezionato.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(m.inviato_at).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {m.clients?.nome ?? "—"} {m.clients?.cognome ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="uppercase">
                        {m.canale}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.message_templates?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-md truncate text-muted-foreground">
                      {m.contenuto}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          m.stato === "inviato"
                            ? "success"
                            : m.stato === "errore"
                              ? "danger"
                              : "default"
                        }
                      >
                        {m.stato}
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

function buildHref(params: { canale: string | null; days: string }) {
  const u = new URLSearchParams();
  if (params.canale) u.set("canale", params.canale);
  if (params.days && params.days !== "30") u.set("days", params.days);
  const qs = u.toString();
  return qs ? `/marketing/cronologia?${qs}` : "/marketing/cronologia";
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-medium uppercase text-primary"
          : "rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </Link>
  );
}
