# Gestionale Fior di Loto — Roadmap completamento tutte le sezioni

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare il gestionale Fior di Loto da stato "Agenda + Bot funzionanti, resto parziale/stub" a stato "POS salone completo" in 7 fasi indipendenti, ciascuna producente software usabile e testabile.

**Architecture:** Next.js 16 App Router, Supabase (DB+Auth+Storage), Drizzle schema, server actions per data layer, Tailwind v4 + palette brand Fresha-like. Ogni fase è un sotto-piano dedicato in `docs/superpowers/plans/<fase>.md`, espandibile in task TDD atomici (2-5 min). Il roadmap qui è la **mappa d'insieme**, non il piano esecutivo di dettaglio.

**Tech Stack:** Next.js 16, TypeScript strict, React 19 client components, Supabase JS client, Drizzle ORM (read-only per i tipi), Vitest, Tailwind CSS v4, lucide-react icons.

---

## Stato attuale (22 Apr 2026 sera)

Mappato via `find src/app/(dashboard) -name page.tsx` (79 pagine) + inventario `src/lib/actions/*.ts` (27 file).

### ✅ Funzionanti end-to-end
| Area | Stato | Note |
|---|---|---|
| Agenda | ✅ | CalendarGrid, DatePickerPopover, slot quick actions, blocchi `blocked_slots`, drawer appt con mark paid/complete/cancel/no-show/delete, hover tooltip, appt grigio se pagato, reminder cron WA+email |
| Checkout | ✅ | Modal 2-step (carrello + 12 metodi), `transaction_items` line items, split payment, card regalo voucher generator, alert transazione effettuata, redirect calendar same-day |
| Bot WA | ✅ | Webhook Meta + Gemini, KB documenti con categorie, takeover operatore, voice/audio, fallback reply su Gemini empty, conversazioni tab, richieste prenotazione (appointment_requests) |
| Clienti drawer | ✅ | Edit inline, menu Attività (avviso/allergie/patch/tag/blocca/elimina), banner warning, wire "Nuovo appuntamento" |
| Clienti profilo | ✅ | `/clienti/[id]` Fresha-style 2-col, 9 tab (4 live, 4 placeholder, 1 link-out) |

### 🟡 Parziali (base c'è, manca polish/features)
| Area | Stato | Gap |
|---|---|---|
| Dashboard home | 🟡 | KPI widgets presenti. Manca: drill-down, confronto periodo, grafici responsivi su mobile |
| Assistente AI | 🟡 | Pagine + logs, ma scope non chiaro (non bot WA, è RAG generico) |
| Servizi / Prodotti (root) | 🟡 | CRUD base funzionante |
| Social | 🟡 | Competitor, news, calendario content ok. Post CRUD TBC |
| Reports | 🟡 | Pagina base + rendimento, servono più dimensioni analytics |

### ❌ Stub / Placeholder (TODO: implementare davvero)
| Area | Stato | Cosa c'è |
|---|---|---|
| Vendite/lista, ordini, pagamenti, appuntamenti, voucher, abbonamenti | ❌ | Empty state card "Nessun X registrato, configura" |
| Catalogo/ordini, fornitori, inventario, abbonamenti | ❌ | Empty state |
| Team/ferie, presenze, turni | ❌ | Pagina esiste ma UI basilare |
| Marketing/automatici, campagne, cronologia, offerte, recensioni, tariffe | ❌ | Placeholder/empty |
| Clienti/fidelizzazione, segmenti | ❌ | Empty |
| Impostazioni/fidelizzazione, pagamenti | 🟡/❌ | Pagina layout ok ma form/logic parziali |

### Scope check
Ogni fase sotto è un **sottosistema indipendente** con DB/actions/UI suoi. Ciascuna produce valore da sola. Ogni fase → sotto-piano dedicato con task TDD 2-5 min.

---

## File structure — organizzazione piani

```
docs/superpowers/plans/
├── 2026-04-23-gestionale-roadmap-completamento.md    ← questo
├── 2026-04-23-fase-1-vendite-pos.md                  ← POS + tabelle vendite
├── 2026-04-23-fase-2-catalogo-inventario.md          ← prodotti/fornitori/ordini/scorte
├── 2026-04-23-fase-3-clienti-avanzati.md             ← segmenti + fidelizzazione
├── 2026-04-23-fase-4-team-management.md              ← turni + ferie + presenze + performance
├── 2026-04-23-fase-5-reports-analytics.md            ← dashboard metriche
├── 2026-04-23-fase-6-marketing.md                    ← campagne + offerte + auto + recensioni
└── 2026-04-23-fase-7-impostazioni.md                 ← completamento sottosezioni config
```

Ogni sotto-piano ha header identico a questo (goal/architecture/tech stack) + task TDD dettagliati. Il roadmap (questo file) definisce ordine, dipendenze, success criteria per fase.

---

## Fase 1 — Vendite & POS (critico, alto valore business)

**Perché prima:** è il buco più grosso ora. Le route `/vendite/lista`, `/vendite/pagamenti`, `/vendite/ordini`, `/vendite/voucher`, `/vendite/abbonamenti`, `/vendite/appuntamenti` sono tutte stub. Il checkout esistente crea già `transactions` + `transaction_items` quindi i dati ci sono — serve solo renderizzarli.

**Dipendenze upstream:** nessuna. Backend già pronto (transactions, transaction_items, vouchers, appointments.pagato_at).

**Output atteso:**
- `/vendite/lista` → tabella paginata di tutte le transazioni (entrata+uscita), filtro periodo/metodo/cliente, export CSV
- `/vendite/pagamenti` → vista raggruppata per metodo_pagamento (contanti/carta/bonifico/...) con totale per metodo
- `/vendite/voucher` → lista voucher emessi (tipo, valore, scadenza, stato redemed/attivo, cliente)
- `/vendite/appuntamenti` → appuntamenti pagati (join appointments+transactions via pagato_at)
- `/vendite/ordini` → vendite di prodotti (filter transaction_items.kind='prodotto')
- `/vendite/abbonamenti` → lista abbonamenti attivi (richiede migration nuova tabella `subscriptions` se non c'è)
- `/vendite` hub root → cards riepilogo con numero e totale per tipo

**Criteri di successo:**
- 6/6 sottopagine vendite mostrano dati reali invece di empty-state placeholder
- Export CSV su `/vendite/lista` funzionante
- Ricerca + filtro periodo su tutte le liste
- Click su riga → drawer dettaglio transazione (chi, cosa, quando, metodo, importo, refund button)

**Sotto-piano:** `2026-04-23-fase-1-vendite-pos.md`

**Effort stima:** 8-10 task TDD. Riusa server actions esistenti (transactions.getTransactions) + aggiunge 4-5 helper (per metodo, voucher list, abbonamenti list).

---

## Fase 2 — Catalogo & inventario

**Perché:** `/catalogo/prodotti` ha base CRUD ma `/catalogo/fornitori`, `/catalogo/ordini`, `/catalogo/inventario`, `/catalogo/abbonamenti` sono stub. I servizi e voucher hanno CRUD parziale.

**Dipendenze upstream:** Fase 1 (ordini prodotti vengono da transactions).

**Output atteso:**
- `/catalogo/prodotti` → CRUD completo con immagini (Supabase Storage), giacenza live, soglia alert, scorporatore fornitore
- `/catalogo/servizi` → CRUD completo con durata/prezzo/categoria/attivo/ordine visibilità
- `/catalogo/voucher` → CRUD template voucher (non le istanze emesse, quelle sono in /vendite/voucher)
- `/catalogo/abbonamenti` → nuova tabella `subscriptions` (nome, sedute, validità, prezzo, servizi inclusi) + CRUD
- `/catalogo/fornitori` → nuova tabella `suppliers` (nome, contatti, p.iva, prodotti forniti) + CRUD
- `/catalogo/ordini` → nuova tabella `purchase_orders` (fornitore, data, righe prodotto, stato consegna, importo) per tracciare riordini scorte
- `/catalogo/inventario` → vista aggregata: prodotti + giacenza attuale + alert scorte basse + movimenti ultimi (entrate da ordini, uscite da vendite)

**Criteri di successo:**
- 7/7 sottopagine catalogo funzionanti (non stub)
- Aggiornamento giacenza automatico: vendita prodotto → -N, consegna ordine fornitore → +N
- Alert visuale "scorte basse" in dashboard home quando giacenza < soglia_alert
- Upload immagine prodotto via Supabase Storage

**Sotto-piano:** `2026-04-23-fase-2-catalogo-inventario.md`

**Effort stima:** 15-18 task (3 nuove migrazioni: suppliers, purchase_orders, subscriptions). 4 CRUD completi + 1 vista aggregata + triggers DB (o application-level) per giacenza.

---

## Fase 3 — Clienti avanzati (segmenti + fidelizzazione)

**Perché:** il profilo cliente è già 80% fatto (tab Panoramica/Appt/Vendite/Articoli). Mancano:
- `/clienti/segmenti` — gestione automatica segmenti (lead, lotina, attiva, inattiva, VIP)
- `/clienti/fidelizzazione` — vista lista premi già collezionati per cliente + redemption manuale
- Export clienti CSV con filtri

**Dipendenze upstream:** nessuna dura (loyalty.ts già esiste come server action).

**Output atteso:**
- `/clienti/segmenti` → dashboard con count per segmento + lista per ciascuno + bulk action "promuovi a VIP"/"sposta a inattiva"
- Regole automatiche segment: ogni notte cron `/api/cron/client-segments` valuta clienti per criteri (es. ≥12 visite/anno → VIP, 0 visite/90gg → inattiva)
- `/clienti/fidelizzazione` → tab per cliente: punti accumulati, premi redimibili, storico redemption
- Export: `/clienti/page.tsx` ha bottone "Esporta CSV" con filtri correnti
- Bulk action: selezione multipla clienti → azioni (invia SMS/email broadcast, aggiungi tag, sposta segmento)

**Criteri di successo:**
- Segmentazione automatica funzionante (cron gira e aggiorna `clients.segmento`)
- Export CSV con colonne scelte + filtro periodo ultima_visita
- Redemption premi in `/clienti/fidelizzazione`

**Sotto-piano:** `2026-04-23-fase-3-clienti-avanzati.md`

**Effort stima:** 10-12 task. Migration per `loyalty_rewards`, `loyalty_redemptions`, `loyalty_points_ledger` se non esistono. Cron endpoint + vercel.json cron.

---

## Fase 4 — Team management

**Perché:** `/team`, `/team/ferie`, `/team/presenze`, `/team/turni` esistono come pagine ma la UI è basic/empty. `/impostazioni/staff` ha CRUD staff member.

**Dipendenze upstream:** tabella `staff` + `staff_ferie` già esistono. Serve aggiungere `staff_turni` + `staff_presenze`.

**Output atteso:**
- `/team` root → overview performance mensile staff (appuntamenti, fatturato, clienti riacquisitati, media €/cliente)
- `/team/turni` → settimana planner: drag & drop turni o form weekly, con template riutilizzabili
- `/team/presenze` → timbrature (clock in/out) per operatrice con calcolo ore lavorate mese
- `/team/ferie` → calendario ferie + approvazione richieste + conflict check con appuntamenti già presi
- Integrazione con agenda: staff in ferie → colonna agenda colorata grigio "In ferie"

**Criteri di successo:**
- Turni settimanali impostabili da UI
- Presenze con clock-in/out via mobile (tap)
- Approva/rifiuta ferie con notifica
- Dashboard performance staff con KPI calcolati da `transaction_items.staff_id` + `appointments`

**Sotto-piano:** `2026-04-23-fase-4-team-management.md`

**Effort stima:** 12-14 task. 2 migrations nuove. Component planner settimanale non banale (UI grid + drag).

---

## Fase 5 — Reports & analytics

**Perché:** `/reports` base + `/reports/rendimento` esistono ma la vista è statica.

**Dipendenze upstream:** Fase 1 (tutte le vendite disponibili).

**Output atteso:**
- `/reports` hub → cards principali (fatturato mese vs mese prec, clienti attivi, nuovi clienti, top servizi, top prodotti, CAC via marketing, LTV medio)
- `/reports/rendimento` → breakdown per operatrice, per servizio, per categoria
- `/reports/cash-flow` → entrate vs uscite mese, profit margin
- `/reports/cohort` → retention clienti per mese di primo acquisto
- Export PDF report mensile per chiudere contabilità

**Criteri di successo:**
- 4-5 dashboard reports con grafici (recharts già dep nel progetto)
- Filtri periodo custom (mese/trimestre/anno/range)
- Export PDF di ciascun report

**Sotto-piano:** `2026-04-23-fase-5-reports-analytics.md`

**Effort stima:** 10-12 task. Aggregation queries Supabase + Recharts components. No DB change.

---

## Fase 6 — Marketing

**Perché:** `/marketing/automatici, campagne, cronologia, offerte, recensioni, tariffe` sono quasi tutti stub. Alta priorità per retention + acquisizione.

**Dipendenze upstream:** Fase 3 (segmenti cliente), Fase 1 (dati vendite per ROI).

**Output atteso:**
- `/marketing/campagne` → CRUD campagne (nome, canale WA/email/SMS, segmento target, messaggio, schedule, stato bozza/programmata/inviata)
- `/marketing/automatici` → trigger rules (es. "Cliente non visita da 60gg → invia SMS offerta riattivazione")
- `/marketing/cronologia` → log di tutte le comunicazioni inviate (da bot, da cron reminder, da campagne), filtrabile
- `/marketing/offerte` → CRUD offerte (codice, sconto %, scadenza, segmenti applicabili) + tracciamento utilizzo
- `/marketing/recensioni` → richiedi recensione post-visita via SMS/WA, raccolta + dashboard rating
- `/marketing/tariffe` → listini prezzi configurabili per staff/orario/giorno-settimana (peak pricing)

**Criteri di successo:**
- Campagne schedulabili + `/api/cron/marketing-send` che esegue le inviate programmate
- Automatici funzionanti (cron giornaliero valuta trigger rules)
- ROI campagna: cliccando su campagna mostra "invii / aperture / conversioni / fatturato attribuito"

**Sotto-piano:** `2026-04-23-fase-6-marketing.md`

**Effort stima:** 18-20 task. 3 migrations (campaigns, marketing_automations, offers). Usa Resend (già configurato) + Meta WA template.

---

## Fase 7 — Impostazioni finali + polish

**Perché:** le sottosezioni `/impostazioni/azienda/orari/pagamenti/fidelizzazione/staff/template-messaggi/assistente/azioni-rapide` sono a vari livelli di completezza.

**Dipendenze upstream:** Fase 1-6 possono aggiungere config point.

**Output atteso:**
- `/impostazioni/azienda` → completata (p.iva, logo upload, footer scontrini, indirizzo sede, orari apertura default)
- `/impostazioni/orari` → form orari settimanali + chiusure straordinarie
- `/impostazioni/pagamenti` → config metodi accettati, IVA, cassa iniziale, scorporo fiscale
- `/impostazioni/fidelizzazione` → config programma punti (1€ = X punti), soglie premi, tier VIP
- `/impostazioni/template-messaggi` → CRUD template WA/email con variabili (già parziale)
- `/impostazioni/profilo-operatore` (nuovo) → cambio password, 2FA opzionale, preferenze dashboard
- `/impostazioni/integrazioni` → connessioni Meta/Google/Stripe (se applicabile)

**Criteri di successo:**
- Tutte le sottopagine impostazioni hanno form editabili salvano in DB via server action
- Logo upload via Supabase Storage → usato negli scontrini PDF

**Sotto-piano:** `2026-04-23-fase-7-impostazioni.md`

**Effort stima:** 8-10 task. No migration grande, principalmente tabella `business_settings` già esistente (vedi `lib/actions/business.ts`).

---

## Success criteria del roadmap complessivo

- [ ] Utente può gestire l'intero workflow salone in app senza "pagine vuote" o "Prossimamente" (eccetto features non richieste tipo "abbonamenti" se non usati)
- [ ] Ogni sezione ha minimo 1 dato reale visibile (non empty state)
- [ ] Export CSV disponibile su clienti, vendite, transazioni
- [ ] Cron jobs attivi: reminder appt (già fatto), segmenti clienti (Fase 3), marketing automatici (Fase 6)
- [ ] 80%+ dei test vitest passanti (oggi 52, stimato finale 100-150)
- [ ] Build Vercel < 90s, bundle size ragionevole (< 500kb per page)

---

## Dipendenze tra fasi

```
Fase 1 (Vendite) ─┬─ Fase 2 (Catalogo) ─── Fase 4 (Team)
                  │                    ╲
                  ├─ Fase 3 (Clienti) ─── Fase 6 (Marketing)
                  │
                  └─ Fase 5 (Reports)

Fase 7 (Impostazioni) → può essere parallela, a polish in corso
```

**Parallelizzabili:**
- Fase 1 + Fase 7: nessuna intersezione
- Fase 2 + Fase 3: tabelle diverse (catalogo vs clienti avanzati)
- Fase 4 + Fase 5: team management e analytics possono iniziare insieme una volta che Fase 1 è live

**Sequenziali strict:**
- Fase 1 DEVE precedere Fase 5 (reports leggono da transactions)
- Fase 3 DEVE precedere Fase 6 (marketing usa segmenti)

---

## Ordine di esecuzione consigliato

1. **Fase 1 — Vendite/POS** (4-5 giorni FTE equivalente) → sblocca sezioni più visibili
2. **Fase 2 — Catalogo** (5-6 giorni) parallelo con Fase 3
3. **Fase 3 — Clienti avanzati** (3-4 giorni) parallelo con Fase 2
4. **Fase 5 — Reports** (3-4 giorni) dopo Fase 1
5. **Fase 4 — Team** (4-5 giorni) dopo Fase 1
6. **Fase 6 — Marketing** (6-7 giorni) dopo Fase 3
7. **Fase 7 — Impostazioni** (2-3 giorni) polish finale

Totale: **~30-35 giorni FTE solo code**, più review/QA.

Con **3 agent paralleli** (pattern già usato per fase 2 checkout): fattibile in **10-12 giorni** di lavoro calendario se il lead sta sopra a coordinare.

---

## Come iniziare

1. Apri `2026-04-23-fase-1-vendite-pos.md` (da creare come primo sotto-piano)
2. Scegli execution mode: subagent-driven o inline
3. Task-by-task con commit atomici + test

Ogni sotto-piano dettaglia:
- File esatti da creare/modificare
- Migration SQL dettagliate
- Server action signatures
- Component structure (server vs client)
- Unit test TDD per business logic
- E2E smoke check manuali

Il roadmap (questo file) resta il riferimento alto — aggiornalo spuntando le fasi completate.

---

## Self-review checklist ✅

- [x] Ogni fase ha goal + success criteria misurabili
- [x] Dipendenze tra fasi esplicitate (grafo + prose)
- [x] Nessun placeholder "TBD" — ogni fase ha scope concreto, migrations nominate, tabelle/endpoint specifici
- [x] Parallelizzazione possibile documentata
- [x] Ordine consigliato giustificato dalla business value + dipendenze tecniche
- [x] Sotto-piani path definito per expansion progressivo

Piano roadmap pronto. Espandere i singoli `fase-N-*.md` quando si decide di eseguire quella fase (evita di scrivere 200 task per 7 fasi tutte insieme).
