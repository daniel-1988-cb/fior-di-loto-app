import type { SubNavGroup } from "./sub-sidebar";

export const V2_ROUTES = {
  root: "/",
  dashboard: "/",
  agenda: "/agenda",
  vendite: "/vendite",
  clienti: "/clienti",
  clientiSegments: "/clienti/segmenti",
  catalogo: "/catalogo",
  catalogoServizi: "/catalogo/servizi",
  catalogoProdotti: "/catalogo/prodotti",
  catalogoVoucher: "/catalogo/voucher",
  catalogoAbbonamenti: "/catalogo/abbonamenti",
  team: "/team",
  teamTurni: "/team/turni",
  teamFerie: "/team/ferie",
  marketing: "/marketing",
  marketingCampagne: "/marketing/campagne",
  marketingOfferte: "/marketing/offerte",
  marketingRecensioni: "/marketing/recensioni",
  reports: "/reports",
  impostazioni: "/impostazioni",
  components: "/components-preview",
} as const;

export const venditeSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/vendite", label: "Riepilogo giornaliero" },
      { href: "/vendite/appuntamenti", label: "Appuntamenti" },
      { href: "/vendite/lista", label: "Vendite" },
      { href: "/vendite/pagamenti", label: "Pagamenti" },
      { href: "/vendite/voucher", label: "Buoni venduti" },
      { href: "/vendite/abbonamenti", label: "Abbonamenti venduti" },
      { href: "/vendite/ordini", label: "Ordini prodotti" },
    ],
  },
];

export const clientiSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/clienti", label: "Elenco clienti" },
      { href: "/clienti/segmenti", label: "Suddivisioni clienti" },
      { href: "/clienti/fidelizzazione", label: "Fidelizzazione" },
    ],
  },
];

export const catalogoSubNav: SubNavGroup[] = [
  {
    title: "Catalogo",
    items: [
      { href: "/catalogo/servizi", label: "Elenco servizi" },
      { href: "/catalogo/voucher", label: "Buoni" },
      { href: "/catalogo/abbonamenti", label: "Abbonamenti" },
      { href: "/catalogo/prodotti", label: "Prodotti" },
    ],
  },
  {
    title: "Inventario",
    items: [
      { href: "/catalogo/inventario", label: "Inventario" },
      { href: "/catalogo/ordini", label: "Ordini di stock" },
      { href: "/catalogo/fornitori", label: "Fornitori" },
    ],
  },
];

export const teamSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/team", label: "Membri del team" },
      { href: "/team/turni", label: "Turni programmati" },
      { href: "/team/ferie", label: "Ferie e permessi" },
      { href: "/team/presenze", label: "Fogli di presenza" },
    ],
  },
];

export const marketingSubNav: SubNavGroup[] = [
  {
    title: "Messaggi",
    items: [
      { href: "/marketing/campagne", label: "Campagne di massa" },
      { href: "/marketing/automatici", label: "Messaggi automatici" },
      { href: "/marketing/cronologia", label: "Cronologia messaggi" },
    ],
  },
  {
    title: "Promozioni",
    items: [
      { href: "/marketing/offerte", label: "Offerte" },
      { href: "/marketing/tariffe", label: "Tariffe smart" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/marketing/recensioni", label: "Recensioni" },
    ],
  },
];

export const reportsSubNav: SubNavGroup[] = [
  {
    items: [
      { href: "/reports", label: "Tutti i report" },
      { href: "/reports/preferiti", label: "Preferiti" },
      { href: "/reports/dashboard", label: "Dashboard" },
      { href: "/reports/vendite", label: "Vendite" },
      { href: "/reports/team", label: "Team" },
      { href: "/reports/clienti", label: "Clienti" },
    ],
  },
];
