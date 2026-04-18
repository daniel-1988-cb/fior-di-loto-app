# Gap analysis — Fresha vs Gestionale Fior di Loto

## Situazione gestionale attuale

**Stack:** Next.js 16 + React 19 + Tailwind 4 + Supabase + Drizzle + lucide-react + recharts + date-fns

**Routes esistenti:**
```
/                                (dashboard home)
/login
/agenda                          (calendar)
/agenda/nuovo
/agenda/checkout/[id]
/clienti                         /clienti/[id] /clienti/nuovo /clienti/[id]/modifica
/servizi                         /servizi/nuovo /servizi/[id]/modifica
/prodotti                        /prodotti/nuovo /prodotti/[id]/modifica
/gestionale                      /gestionale/nuovo
/gestionale/voucher              /gestionale/voucher/nuovo
/impostazioni                    /impostazioni/staff/[id] /impostazioni/staff/nuovo
/assistente                      /assistente/documenti /assistente/logs
/social                          /social/calendario /social/competitor /social/news /social/nuovo
/whatsapp
```

**Componenti layout esistenti:**
- `src/components/layout/sidebar.tsx`
- `src/components/layout/mobile-bottom-nav.tsx`
- `src/components/dashboard/charts.tsx`
- `src/components/clienti/client-list.tsx`, `add-interaction-form.tsx`
- `src/components/impostazioni/obiettivi-team.tsx`, `export-section.tsx`
- `src/components/prodotti/stock-controls.tsx`
- `src/components/social/` (calendario, competitor, kanban, news, social-nav)
- `src/components/whatsapp/reminder-flow.tsx`

## Mapping Fresha → Gestionale

| Fresha | Gestionale attuale | Stato | Azione |
|---|---|---|---|
| `/dashboard` (card grafici) | `/` | Presente ma semplice | **Refactor**: card layout Fresha-like con line/bar chart |
| `/calendar` (day, colonne staff) | `/agenda` | Presente | **Refactor core**: colonne staff, drawer detail, "now" line |
| `/sales/*` (7 sotto) | `/gestionale` | Molto semplice | **Estendere**: aggiungere 6 sotto-viste |
| `/clients/list` | `/clienti` | Presente | **Refactor**: tabella con avatar+rating, drawer detail |
| `/clients/segments` | ❌ | Manca | **New**: sistema segments standard+custom |
| `/clients/loyalty` | ❌ | Manca | **New** (fase tardiva) |
| `/catalogue/services` | `/servizi` | Presente | **Refactor**: sidebar categorie, card servizio |
| `/catalogue/products` | `/prodotti` | Presente | **Refactor**: layout coerente |
| `/catalogue/vouchers` | `/gestionale/voucher` | Presente | **Sposta** sotto Catalogo |
| `/catalogue/memberships` | ❌ | Manca | **New** |
| `/catalogue/inventory` | via `stock-controls` | Parziale | **Estendere**: inventario dedicato |
| `/catalogue/orders` | ❌ | Manca | **New** (ordini di stock) |
| `/team/team-members` | `/impostazioni/staff` | Presente | **Sposta** sotto Team (sezione dedicata) |
| `/team/scheduled-shifts` | via `staff_ferie` | Parziale | **New UI**: editor turni |
| `/team/timesheets` | ❌ | Manca | **New** |
| `/team/pay-runs` | ❌ | Manca | **Skippabile** v1 |
| `/marketing/blast-campaigns` | `/whatsapp` | Parziale | **Integrare** |
| `/marketing/automated-messages` | via `reminder-flow` | Parziale | **Estendere** |
| `/marketing/deals` | ❌ | Manca | **New** |
| `/marketing/reviews` | ❌ | Manca | **New** |
| `/reports` (hub 53 report) | dashboard home | Parziale | **New module** completo |
| `/add-ons` | ❌ | Manca | **Skippabile** (nostro AI assistant copre parte) |
| `/setup` (4 tab) | `/impostazioni` | Semplice | **Refactor**: 4 tab pattern Fresha |

## Elementi gestionale NON presenti in Fresha (conservare)
- `/assistente` (AI RAG — valore distintivo)
- `/social` (calendario social + competitor + news)
- Import chat/CRM WhatsApp con logica propria

## Verdetto: refactor NON da zero
Molta logica dati/Supabase è già in piedi. Il lavoro è:
1. **Design system** coerente (oggi è basic Tailwind)
2. **Layout shell** con sidebar icon-only + sub-sidebar + drawer pattern
3. **Refactor UI** per ciascuna sezione seguendo i pattern Fresha
4. **Nuove sottosezioni** mancanti (segments, memberships, reports hub, team scheduling, deals)
