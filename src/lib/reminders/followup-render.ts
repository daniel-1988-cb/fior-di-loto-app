// Pure helper for follow-up message rendering. Tenuto fuori da
// `src/lib/actions/*` perché quei moduli sono "use server" — solo async exports.
// Test: src/lib/reminders/__tests__/followup-render.test.ts

export type FollowUpRenderContext = {
  firstName: string;
  serviceName: string;
  appointmentDateTime: Date;
  now: Date;
};

const TZ = "Europe/Rome";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format the appointment time as "HH:MM" in Europe/Rome.
 */
function formatTimeRome(date: Date): string {
  const fmt = new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // Intl returns "15:30" with non-breaking space sometimes — normalize.
  return fmt.format(date).replace(/\s/g, "");
}

/**
 * "domani" if appt is between now+0h and now+36h (next-day window)
 * "oggi" if appt is between now and now+12h
 * altrimenti "il DD/MM" in Europe/Rome
 *
 * Order matters: oggi (≤12h) checked before domani (≤36h) so a 6h-from-now
 * appt is rendered as "oggi" not "domani".
 */
function formatRelativeDate(appt: Date, now: Date): string {
  const diffMs = appt.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH >= 0 && diffH <= 12) return "oggi";
  if (diffH > 0 && diffH <= 36) return "domani";

  // Fallback "il DD/MM" in Europe/Rome
  const fmt = new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(appt);
  const day = parts.find((p) => p.type === "day")?.value ?? pad2(appt.getDate());
  const month =
    parts.find((p) => p.type === "month")?.value ?? pad2(appt.getMonth() + 1);
  return `il ${day}/${month}`;
}

/**
 * Sostituisce placeholder nel template:
 *   {nome}     → primo nome cliente
 *   {servizio} → service name
 *   {ora}      → "15:30" in Europe/Rome
 *   {data}     → "oggi" / "domani" / "il 28/04"
 *   {salone}   → "Fior di Loto"
 *
 * Placeholder non riconosciuti vengono lasciati invariati per evitare
 * di mangiarli silenziosamente. Mai throwa.
 */
export function renderFollowUpMessage(
  template: string,
  ctx: FollowUpRenderContext,
): string {
  const firstName = (ctx.firstName || "").split(" ")[0] || ctx.firstName || "";
  const ora = formatTimeRome(ctx.appointmentDateTime);
  const data = formatRelativeDate(ctx.appointmentDateTime, ctx.now);

  const replacements: Record<string, string> = {
    "{nome}": firstName,
    "{servizio}": ctx.serviceName || "il trattamento",
    "{ora}": ora,
    "{data}": data,
    "{salone}": "Fior di Loto",
  };

  let out = template;
  for (const [key, val] of Object.entries(replacements)) {
    out = out.split(key).join(val);
  }
  return out;
}
