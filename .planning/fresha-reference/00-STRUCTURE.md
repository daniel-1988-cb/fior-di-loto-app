# Fresha Partners — Mappa completa sezioni e sottosezioni

**Fonte:** partners.fresha.com (account Fior di Loto, 18 Apr 2026)
**Scopo:** reference per refactor UI/UX gestionale Fior di Loto — pattern UX ispirati, NON copia pixel-perfect

---

## Layout shell

- **Sidebar icon-only nera** a sinistra (~60px wide, 10 icone + logo)
- **Topbar** con logo "fresha" sx + 6 icone top-right (search, stats, rocket, bell, calendar-box, avatar)
- **Content area** bianca con opzionale **sub-sidebar grigia** (~240px) per navigazione intra-sezione
- Selected state = icona viola filled (#6B4EFF bg + white icon)

## Header icone (top-right)
1. Search (cerca globale)
2. Stats/quick analytics
3. Rocket (crescita/grow)
4. Notifications
5. Calendar/box (quick checkout o timer?)
6. Avatar utente

---

## Sidebar top-level (10 sezioni)

### 1. Home `/dashboard`
Overview. Card grid:
- **Vendite recenti** (ultimi 7gg): big number €, metriche (appuntamenti, valore medio), line chart dual (vendite vs appuntamenti)
- **Prossimi appuntamenti** (prossimi 7gg): big number, breakdown confermati/annullati, bar chart stacked
- **Attività degli appuntamenti** — feed lista (data, ora, stato, servizio, cliente, durata, staff)
- **Prossimi appuntamenti di oggi** — lista simile
- **I servizi migliori** — tabella (servizio × questo mese × mese scorso)
- **Miglior membro del team** — tabella staff × fatturato mese

### 2. Calendar `/calendar`
Timeline scheduling. Header:
- "Oggi" button + date picker (`<` sab 18 apr `>`)
- "Membri del team di turno" dropdown
- Filters icon
- Settings/refresh icons
- **View switcher**: Giorno / Settimana / Mese (dropdown)
- **Aggiungi** primary CTA (+nuovo appuntamento)

Layout:
- Colonne verticali per staff (avatar cerchio colorato + nome)
- Slot orari verticali 15min
- Event blocks colorati per servizio (ora-ora nome-cliente servizio durata staff)
- **Linea rossa "now"** con ora (es. 19:12)
- Aree grigie = fuori turno

Sub-routes:
- `/calendar/drawer/visibility-filters` — filtri visibilità
- `/calendar` settings drawer
- Lista d'attesa drawer

### 3. Sales `/sales/daily-sales` — 7 sottosezioni
- `/sales/daily-sales` — Riepilogo giornaliero (2 tabelle affiancate: transazioni per tipo + movimenti cassa)
- `/sales/appointments-list` — Appuntamenti (lista)
- `/sales/sales-list` — Vendite (lista)
- `/sales/payment-transactions` — Pagamenti
- `/sales/vouchers` — Buoni venduti
- `/sales/paid-plans` — Abbonamenti venduti
- `/sales/store-orders` — Ordini di prodotti

### 4. Clients `/clients/list` — 3 sottosezioni
- `/clients/list` — **Elenco clienti** (4147 totali)
  - Header: count badge, Opzioni dropdown, Aggiungi primary
  - Search bar + Filtri + Sort dropdown
  - Tabella: checkbox, avatar+nome, cellulare, recensioni, vendite €, creato il
  - Banner "profili duplicati" con CTA integrazione intelligente
- `/clients/segments` — **Suddivisioni** (11)
  - Tab: Standard / Personalizzabile
  - Card segment: icon circle, nome + count badge viola, descrizione, "Attività ▼"
  - Standard: Nuovi clienti, Clienti recenti, Primo appuntamento, Clienti fedeli, ecc.
- `/clients/loyalty` — **Fidelizzazione** (programma punti)

### 5. Catalogue `/catalogue/services` — 7 sottosezioni (2 gruppi)

**Catalogo:**
- `/catalogue/services` — Elenco servizi (con sidebar Categorie + tab)
- `/catalogue/vouchers` — Buoni
- `/catalogue/memberships` — Abbonamenti
- `/catalogue/products` — Prodotti

**Inventario:**
- `/catalogue/inventory` — Inventario
- `/catalogue/orders` — Ordini di stock
- `/catalogue/suppliers` — Fornitori

Pattern servizi: sub-sidebar "Categorie" (Tutte categorie 99+, Natale 2025, San Valentino 2025, ecc.), main content card servizio (nome, durata, descrizione, prezzo, menu ⋮).

### 6. Team `/team/team-members` — 4 sottosezioni
- `/team/team-members` — Membri (tabella con avatar, nome, ruolo, email+phone, rating stelline, permesso)
- `/team/scheduled-shifts` — Turni programmati
- `/team/timesheets` — Fogli di presenza
- `/team/pay-runs` — Retribuzioni

### 7. Marketing `/marketing/blast-campaigns/home` — 6 sottosezioni (3 gruppi)

**Messaggi:**
- `/marketing/blast-campaigns/home` — Campagne di massa
- `/marketing/automated-messages` — Messaggi automatici
- `/marketing/message-history` — Cronologia messaggi

**Promozioni:**
- `/marketing/deals` — Offerte
- `/marketing/peak-pricing` — Tariffe smart

**Engagement:**
- `/marketing/reviews` — Recensioni

### 8. Reports `/reports`
Hub report. Layout:
- **Left sidebar**: Tutti i report (53), Preferiti (1), Dashboard (3), Standard (45), Premium (8), Personalizzabile (0), Obiettivi
- **Top tabs**: Tutti i report / Vendite / Finanze / Appuntamenti / Team / Clienti / Inventario
- **Search bar** + Creato da dropdown + Categoria dropdown
- **Cards report**: icon + titolo + descrizione + badge Premium + preferito (stella)
- **Cartelle** custom (Aggiungi cartella)
- **Data Connector** separato

### 9. Add-ons `/add-ons`
Componenti aggiuntivi. Grid 3 col:
- Pagamenti (Attivo badge verde)
- Assistenza Premium (Attivo)
- Insight
- Google Reviews
- Fidelizzazione del cliente
- Data Connector
- (altri a seguire)
Ogni card: icon colorato (purple/orange/teal/green), titolo, descrizione, "Vedi" button outline.

### 10. Setup `/setup`
**4 tab orizzontali**: Impostazioni / Presenza online / Marketing / Altro

**Impostazioni (tab 1):**
- Configurazione attività
- Pianificazione
- Vendite
- Clienti
- Fatturazione
- Team
- Moduli
- Pagamenti

**Presenza online (tab 2):**
- Profilo sul marketplace
- Prenota con Google
- Prenota con Facebook/Instagram
- Negozio online
- Generatore di link

**Marketing (tab 3):**
- Marketing di massa
- Messaggi automatici
- Offerte
- Tariffe smart
- Messaggi inviati
- Valutazioni e recensioni

**Altro (tab 4):**
- Componenti aggiuntivi
- Integrazioni

Pattern: card grid 3 col con icon outline + titolo + descrizione (senza CTA diretto, tutta la card è clickabile).

---

## Design tokens osservati

| Token | Valore stimato |
|---|---|
| Primary accent | `#6B4EFF` (viola Fresha) |
| CTA primary | `#000000` (nero) su bianco |
| Bg page | `#FFFFFF` |
| Bg sidebar sub | `#F7F7F8` (grigio chiarissimo) |
| Border | `#E5E5EA` |
| Text primary | `#111111` |
| Text secondary | `#6B7280` |
| "Now" line | `#E11D48` (rosso) |
| Radius card | 8-12px |
| Radius button | Full (pill) |
| H1 | ~30-36px, bold |
| Font | Sans-serif moderno (Inter/SF-like) |

## Pattern componenti

- **Button primary**: `bg-black text-white rounded-full px-6 py-3`
- **Button secondary**: `bg-white border rounded-full px-6 py-3` con `▼` chevron
- **Tab active**: pill nera `rounded-full bg-black text-white`
- **Tab inactive**: testo grigio su bg trasparente
- **Table row**: avatar circle (40px) + nome bold + sottotitolo (ruolo), hover `bg-gray-50`
- **Card**: `bg-white rounded-xl border p-6`, header con titolo + count badge circolare
- **Drawer**: slide from right per profili cliente e appointment detail
- **Sub-sidebar**: sticky list di link, active state = bg grigio chiaro

## Micro-flow osservati

- **Appointment drawer** → `/dashboard/drawer/appointment/{id}?resetAppointmentState=true` (drawer, non page)
- **Calendar drawer** → visibility filters, settings, waitlist come drawer laterale
- **Dashboard drawer** → apertura record da feed

**Implicazione**: Fresha usa molto i drawer laterali invece di navigare a nuove route → pattern da replicare.
