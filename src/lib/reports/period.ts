/**
 * Server-safe helpers for period selection in reports.
 *
 * IMPORTANT: questo file NON ha "use client" — può essere importato sia da
 * server components che da client components. I helper qui erano in
 * `src/components/reports/period-selector.tsx` ("use client") e questo
 * causava errori subtili quando un server component li importava.
 */

export type PresetKey =
  | "oggi"
  | "ieri"
  | "settimana"
  | "mese"
  | "trimestre"
  | "anno"
  | "custom";

export const PRESET_LABELS: Record<PresetKey, string> = {
  oggi: "Oggi",
  ieri: "Ieri",
  settimana: "Settimana",
  mese: "Mese",
  trimestre: "Trimestre",
  anno: "Anno",
  custom: "Custom",
};

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Given a preset key, returns {from, to} in YYYY-MM-DD. */
export function computePreset(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  const todayStr = ymd(now);
  switch (preset) {
    case "oggi":
      return { from: todayStr, to: todayStr };
    case "ieri": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const s = ymd(y);
      return { from: s, to: s };
    }
    case "settimana": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: ymd(start), to: todayStr };
    }
    case "mese": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: ymd(start), to: ymd(end) };
    }
    case "trimestre": {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { from: ymd(start), to: ymd(end) };
    }
    case "anno": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: ymd(start), to: ymd(end) };
    }
    case "custom":
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: ymd(start), to: todayStr };
    }
  }
}

/** Helper server-side: estrae il periodo dai searchParams. */
export function parsePeriodoFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): { from: string; to: string } {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const from = get("from");
  const to = get("to");
  const isValid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (isValid(from) && isValid(to)) return { from: from!, to: to! };
  return computePreset("mese");
}
