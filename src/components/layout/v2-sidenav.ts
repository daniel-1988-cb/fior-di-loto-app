import type { SubNavGroup } from "./sub-sidebar";

export const V2_ROUTES = {
  root: "/v2-preview",
  dashboard: "/v2-preview",
  agenda: "/v2-preview/agenda",
  vendite: "/v2-preview/vendite",
  clienti: "/v2-preview/clienti",
  clientiSegments: "/v2-preview/clienti/segmenti",
  catalogo: "/v2-preview/catalogo",
  catalogoServizi: "/v2-preview/catalogo/servizi",
  catalogoProdotti: "/v2-preview/catalogo/prodotti",
  catalogoVoucher: "/v2-preview/catalogo/voucher",
  catalogoAbbonamenti: "/v2-preview/catalogo/abbonamenti",
  team: "/v2-preview/team",
  teamTurni: "/v2-preview/team/turni",
  teamFerie: "/v2-preview/team/ferie",
  marketing: "/v2-preview/marketing",
  marketingCampagne: "/v2-preview/marketing/campagne",
  marketingOfferte: "/v2-preview/marketing/offerte",
  marketingRecensioni: "/v2-preview/marketing/recensioni",
  reports: "/v2-preview/reports",
  impostazioni: "/v2-preview/impostazioni",
  components: "/components-preview",
} as const;

export const venditeSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/v2-preview/vendite", label: "Riepilogo giornaliero" },
      { href: "/v2-preview/vendite/appuntamenti", label: "Appuntamenti" },
      { href: "/v2-preview/vendite/lista", label: "Vendite" },
      { href: "/v2-preview/vendite/pagamenti", label: "Pagamenti" },
      { href: "/v2-preview/vendite/voucher", label: "Buoni venduti" },
      { href: "/v2-preview/vendite/abbonamenti", label: "Abbonamenti venduti" },
      { href: "/v2-preview/vendite/ordini", label: "Ordini prodotti" },
    ],
  },
];

export const clientiSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/v2-preview/clienti", label: "Elenco clienti" },
      { href: "/v2-preview/clienti/segmenti", label: "Suddivisioni clienti" },
      { href: "/v2-preview/clienti/fidelizzazione", label: "Fidelizzazione" },
    ],
  },
];

export const catalogoSubNav: SubNavGroup[] = [
  {
    title: "Catalogo",
    items: [
      { href: "/v2-preview/catalogo/servizi", label: "Elenco servizi" },
      { href: "/v2-preview/catalogo/voucher", label: "Buoni" },
      { href: "/v2-preview/catalogo/abbonamenti", label: "Abbonamenti" },
      { href: "/v2-preview/catalogo/prodotti", label: "Prodotti" },
    ],
  },
  {
    title: "Inventario",
    items: [
      { href: "/v2-preview/catalogo/inventario", label: "Inventario" },
      { href: "/v2-preview/catalogo/ordini", label: "Ordini di stock" },
      { href: "/v2-preview/catalogo/fornitori", label: "Fornitori" },
    ],
  },
];

export const teamSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/v2-preview/team", label: "Membri del team" },
      { href: "/v2-preview/team/turni", label: "Turni programmati" },
      { href: "/v2-preview/team/ferie", label: "Ferie e permessi" },
      { href: "/v2-preview/team/presenze", label: "Fogli di presenza" },
    ],
  },
];

export const marketingSubNav: SubNavGroup[] = [
  {
    title: "Messaggi",
    items: [
      { href: "/v2-preview/marketing/campagne", label: "Campagne di massa" },
      { href: "/v2-preview/marketing/automatici", label: "Messaggi automatici" },
      { href: "/v2-preview/marketing/cronologia", label: "Cronologia messaggi" },
    ],
  },
  {
    title: "Promozioni",
    items: [
      { href: "/v2-preview/marketing/offerte", label: "Offerte" },
      { href: "/v2-preview/marketing/tariffe", label: "Tariffe smart" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/v2-preview/marketing/recensioni", label: "Recensioni" },
    ],
  },
];

export const reportsSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/v2-preview/reports", label: "Tutti i report" },
      { href: "/v2-preview/reports/preferiti", label: "Preferiti" },
      { href: "/v2-preview/reports/dashboard", label: "Dashboard" },
      { href: "/v2-preview/reports/vendite", label: "Vendite" },
      { href: "/v2-preview/reports/team", label: "Team" },
      { href: "/v2-preview/reports/clienti", label: "Clienti" },
    ],
  },
];
