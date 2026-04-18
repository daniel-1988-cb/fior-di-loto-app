# Milestone plan — Refactor UI/UX gestionale "Fresha-inspired"

**Scope:** evolvere il gestionale Fior di Loto per avere UX paragonabile a Fresha.
**Approccio:** pattern UX ispirati (layout, flussi, interazioni) — NO copia pixel-perfect di asset/icone/testi Fresha.
**Strategia:** incrementale per fasi, non big-bang. Ogni fase è mergiabile in autonomia.

---

## Fase 0 — Design system foundations (BASE)
**Obiettivo:** token design + componenti atomici riusabili, compatibili con Tailwind 4.

- [ ] Definire tokens in `src/app/globals.css` o `tailwind.config`: colori (primary/accent/neutrals), radii, spacing, typography scale
- [ ] Refactor font stack (DM Serif display + Jost sans, mantenendo brand fonts della memoria) ma con tipografia più compatta stile Fresha
- [ ] Componenti atomici in `src/components/ui/`: `Button`, `Input`, `Select`, `Tab`, `Card`, `Badge`, `Avatar`, `Table`, `DropdownMenu`, `Drawer`, `Tooltip`
- [ ] Storybook-lite: una pagina `/components-preview` per vedere tutto
- [ ] Verifica compatibilità dark mode (già presente nel gestionale)

## Fase 1 — Layout shell
**Obiettivo:** sidebar icon-only + sub-sidebar + content, drawer pattern.

- [ ] `src/components/layout/shell.tsx` con 3 slot: icon-sidebar, sub-sidebar (optional), content
- [ ] Refactor `sidebar.tsx` in icon-only (60px) con tooltip su hover — icone per ogni sezione
- [ ] Sub-sidebar component condiviso (ricicla da `social-nav` pattern)
- [ ] Topbar con logo + icone right (search, notifications, avatar menu)
- [ ] Drawer component (slide da destra) per profili/dettagli
- [ ] Mobile: bottom-nav conserva + drawer full-screen

## Fase 2 — Dashboard home rework
**Obiettivo:** home dashboard con card Fresha-like.

- [ ] Card "Vendite recenti" con line chart dual (vendite € + n appuntamenti) — usa `recharts` (già in deps)
- [ ] Card "Prossimi appuntamenti" con bar chart stacked (confermati/cancellati)
- [ ] Feed "Attività appuntamenti" (lista con avatar + stato badge)
- [ ] Feed "Prossimi oggi"
- [ ] Tabella "Servizi migliori" (questo mese vs scorso)
- [ ] Tabella "Miglior membro team" (fatturato mese)
- [ ] Dati da Supabase: aggregazioni SQL efficienti, cache 5min

## Fase 3 — Calendar core refactor
**Obiettivo:** calendar con colonne staff, drawer, view switcher.

- [ ] Day view con N colonne staff (dinamico)
- [ ] Slot time verticali (15min), sticky time axis
- [ ] Event blocks colorati per servizio (colore da `services.colore`)
- [ ] "Now" red line aggiornata via interval
- [ ] Week view (colonne giorno × staff rows o matrice)
- [ ] Appointment drawer (click su evento → drawer detail invece di route)
- [ ] Filtri: staff of turno, servizio, stato
- [ ] CTA "Aggiungi" con quick-create form
- [ ] Conservare `/agenda/nuovo` come full-page per creazione avanzata

## Fase 4 — Clients module rework
**Obiettivo:** lista clienti Fresha-like + segments.

- [ ] Tabella `/clienti` con avatar+iniziali, nome, telefono, rating, vendite totali, creato il
- [ ] Filtri + search + sort
- [ ] Drawer profilo cliente (no page) con tabs: Info, Appuntamenti, Vendite, Note
- [ ] `/clienti/segments` nuova: 10+ segmenti standard (Nuovi, Recenti, Primo app., Fedeli, Assenti da X, ecc.) con count + CTA "attività"
- [ ] Query SQL per ogni segmento (definizioni standard vs custom)
- [ ] (Fase tardiva) `/clienti/loyalty` programma punti

## Fase 5 — Sales module (ex "gestionale")
**Obiettivo:** rinominare + 7 sottoviste.

- [ ] Nuovo top-level `/vendite` (o mantenere `/gestionale` con sub-routes)
- [ ] `/vendite/riepilogo` — 2 tabelle (transazioni per tipo + movimenti cassa) per data
- [ ] `/vendite/appuntamenti` — lista appuntamenti con filtri
- [ ] `/vendite/lista` — tutte le vendite
- [ ] `/vendite/pagamenti` — transazioni payment
- [ ] `/vendite/voucher` — sposta da `/gestionale/voucher`
- [ ] `/vendite/abbonamenti` — (se memberships implementato)
- [ ] `/vendite/ordini-prodotti` — ordini e-commerce o ricambi
- [ ] Export CSV universale

## Fase 6 — Catalogue rework
**Obiettivo:** consolidare servizi/prodotti/voucher sotto catalogo.

- [ ] Sub-nav unificata con link: Servizi / Voucher / Abbonamenti / Prodotti / Inventario / Ordini / Fornitori
- [ ] `/servizi` con sub-sidebar "Categorie" (count per categoria, filtro rapido)
- [ ] Card servizio redesign (durata, prezzo, descrizione, immagine opz.)
- [ ] `/prodotti` layout coerente
- [ ] `/abbonamenti` NEW — setup piani (prezzo, ricorrenza, servizi inclusi, limite)
- [ ] `/inventario` NEW — stock tracking dedicato
- [ ] `/fornitori` NEW (opz. v2)

## Fase 7 — Team module
**Obiettivo:** staff gestione completa.

- [ ] Sposta `/impostazioni/staff` → `/team/membri`
- [ ] Tabella membri: avatar, nome, ruolo, contatto, rating stelline, permessi, attivo
- [ ] `/team/turni` NEW — editor turni settimanale (grid staff × giorni)
- [ ] `/team/presenze` NEW — timesheet (opz., richiede tracking presenze)
- [ ] `/team/ferie` — UI dedicata (tabella `staff_ferie` già esiste)
- [ ] Skip `/team/retribuzioni` (fuori scope v1)

## Fase 8 — Marketing consolidato
**Obiettivo:** unire whatsapp + automated messages + campagne.

- [ ] `/marketing` hub con 3 gruppi: Messaggi / Promozioni / Engagement
- [ ] Integrare `/whatsapp` come sub-feature
- [ ] `/marketing/campagne` NEW — blast messaggi (WhatsApp/email/SMS)
- [ ] `/marketing/automatici` — estendere `reminder-flow` (reminder, auguri, post-app)
- [ ] `/marketing/offerte` NEW — codici sconto, flash sale
- [ ] `/marketing/recensioni` NEW — aggregazione review (Google integrato)

## Fase 9 — Reports module
**Obiettivo:** hub report per insight business.

- [ ] `/reports` con sidebar categorie (Vendite, Finanze, Appuntamenti, Team, Clienti, Inventario)
- [ ] Top tabs categoria
- [ ] Search + sort + preferiti (stella)
- [ ] 10-15 report essenziali v1: fatturato mese, vendite per staff, clienti attivi, ecc.
- [ ] Report viewer con filtri data + export PDF/CSV
- [ ] (Futuro) report custom builder

## Fase 10 — Setup reorg
**Obiettivo:** `/impostazioni` con 4 tab stile Fresha.

- [ ] 4 tab: Impostazioni / Presenza online / Marketing / Altro
- [ ] Tab 1 — Impostazioni: Configurazione attività (orari, sede), Vendite (metodi pagamento, IVA), Clienti (tag, fonti), Team (permessi, ferie), Moduli (form cliente)
- [ ] Tab 2 — Presenza online: integrazioni (Google Business, FB/IG booking, link booking pubblico, QR code)
- [ ] Tab 3 — Marketing: shortcut a moduli marketing
- [ ] Tab 4 — Altro: AI assistant settings, integrazioni API (Meta, WhatsApp Cloud), data export
- [ ] Card grid 3 col con icon + titolo + descrizione

## Fase 11 — Polish & perf
- [ ] Skeleton loaders su tutte le liste
- [ ] Empty states con illustrazione + CTA
- [ ] Error boundaries
- [ ] Lighthouse audit: LCP < 2s, CLS < 0.1
- [ ] Tests E2E per flussi chiave (book appointment, create voucher, search client)

---

## Stima complessiva
- Fasi 0-1 (foundations): ~3-5 giorni
- Fase 2 (dashboard): ~2 giorni
- Fase 3 (calendar): ~4-6 giorni (il pezzo più complesso)
- Fasi 4-5 (clients + sales): ~3-4 giorni ciascuna
- Fase 6 (catalogue): ~3 giorni
- Fase 7 (team): ~2-3 giorni
- Fase 8 (marketing): ~3 giorni
- Fase 9 (reports): ~4-5 giorni
- Fase 10 (setup): ~2 giorni
- Fase 11 (polish): ~2 giorni

**Totale stimato: ~30-40 giorni sviluppo** (con TDD + verifiche).

## Ordine consigliato
Fase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

## Note legali
- NO copia di SVG/icone/illustrazioni/testi Fresha
- NO riproduzione di pattern proprietari (algoritmi di pricing smart, formule loyalty)
- Pattern UX generici (calendar-with-staff-columns, pill-shaped buttons, drawer navigation) sono non-proteggibili → free to reuse
- Usare Lucide icons (già in deps), font già in `_brand_assets/` del workspace
