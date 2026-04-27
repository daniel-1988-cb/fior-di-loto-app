/** Centralised segmento helpers — used by client-list, client detail page, etc. */

export const SEGMENTI = [
  { value: "tutti",    label: "Tutti",    color: "" },
  { value: "lotina",   label: "Lotina",   color: "bg-gold/20 text-gold-dark" },
  { value: "nuova",    label: "Nuova",    color: "bg-success/20 text-success" },
  { value: "lead",     label: "Lead",     color: "bg-info/20 text-info" },
  { value: "vip",      label: "VIP",      color: "bg-rose/20 text-rose-dark" },
  { value: "inattiva", label: "Inattiva", color: "bg-muted text-muted-foreground" },
] as const;

export function getSegmentoStyle(segmento: string): string {
  const found = SEGMENTI.find((s) => s.value === segmento);
  return found?.color || "bg-muted text-muted-foreground";
}

export function getSegmentoLabel(segmento: string): string {
  const found = SEGMENTI.find((s) => s.value === segmento);
  return found?.label || segmento;
}
