export const VALID_CATEGORIE = [
  "generale",
  "listino",
  "metodo-rinascita",
  "faq",
  "policy",
  "offerte",
  "trattamenti",
] as const;

export type Categoria = (typeof VALID_CATEGORIE)[number];

export const CATEGORIA_LABELS: Record<string, string> = {
  generale: "Generale",
  listino: "Listino prezzi",
  "metodo-rinascita": "Metodo Rinascita",
  faq: "FAQ",
  policy: "Policy e regole",
  offerte: "Offerte e promo",
  trattamenti: "Trattamenti",
};

export function normalizeCategoria(c: string | undefined | null): Categoria {
  if (c && (VALID_CATEGORIE as readonly string[]).includes(c)) {
    return c as Categoria;
  }
  return "generale";
}
