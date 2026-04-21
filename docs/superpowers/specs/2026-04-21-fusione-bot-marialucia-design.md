# Fusione Bot Marialucia in Gestionale Fior di Loto — Design

**Data:** 2026-04-21
**Stato:** draft (in attesa review)
**Autore:** Claude + Daniel

> ⚠️ **Next.js 16.2.1 ha breaking changes** rispetto a Next.js 14/15. Prima di scrivere codice, consultare `node_modules/next/dist/docs/` per le convenzioni correnti (route handlers, App Router, middleware, runtime). Vedi `AGENTS.md` del repo.

---

## 1. Contesto e obiettivo

Il gestionale Fior di Loto (`fior-di-loto-app`, Next.js 16 App Router TS) e il bot WhatsApp Marialucia (`Bot_Marialucia/marialucia/`, Node plain JS) sono oggi due codebase separate che condividono l'ecosistema Vercel + Supabase + Anthropic SDK. Il bot è un prototipo di ~470 righe su 11 file, con dati solo di test.

L'obiettivo è:

- **A) Manutenzione unificata** — un repo, un deploy, una dashboard, tipi condivisi.
- **B) Integrazione funzionale** — il gestionale pilota il bot (invio manuale, promemoria automatici, campagne WhatsApp) e il bot alimenta il gestionale (conversazioni, prenotazioni inferite, escalation).

Si coglie l'occasione per sostituire il provider WhatsApp da 360dialog a **Meta WhatsApp Cloud API** (ufficiale, gratuita per il volume atteso).

## 2. Stato attuale (before)

**Gestionale:**
- Next.js 16.2.1, TypeScript, Drizzle ORM
- Supabase progetto `ixieormnmohexekoufnn` (eu-central-1)
- Deploy Vercel `prj_hQqj1mpJNXeLoAUi1JTpUKGdIoS1` (team `danieliannantuono-8687s-projects`)
- 59 pagine, moduli: clienti, agenda, vendite, catalogo, team, marketing, assistente IA, impostazioni
- Git pulito, `main` aggiornato al 19 Apr, typecheck verde

**Bot:**
- Node JS plain, serverless functions Vercel (deploy stato incerto)
- Supabase progetto `yyiasimarhipaeyzjipz` (eu-west-1) — **ora in pausa, verrà eliminato manualmente**
- Provider WhatsApp: 360dialog (da dismettere)
- Integrazioni: Anthropic, Google Calendar, n8n
- Cartella: `01_Progetti_Attivi/Bot_Marialucia/marialucia/`

## 3. Architettura target (after)

**Repo unico** `fior-di-loto-app`, branch di lavoro `feat/bot-fusion`.

```
src/
├── app/
│   ├── (app)/bot/                         Dashboard bot (sezione gestionale)
│   │   ├── conversazioni/                 Lista thread + dettaglio messaggi
│   │   ├── invio/                         Invio manuale / broadcast segmentato
│   │   └── impostazioni/                  System prompt, template, toggle
│   └── api/
│       └── whatsapp/
│           ├── webhook/route.ts           GET (hub.challenge) + POST (inbound)
│           └── send/route.ts              Outbound protetto (bearer)
├── lib/
│   ├── bot/
│   │   ├── marialucia-system-prompt.ts    System prompt estratto (vedi §8)
│   │   ├── claude.ts                      Chiamata Anthropic + gestione cronologia
│   │   ├── whatsapp-meta.ts               Meta Cloud API send/verify
│   │   ├── message-buffer.ts              Aggregazione 4s messaggi multipli
│   │   ├── booking.ts                     Inferenza slot da conversazione
│   │   └── intent.ts                      Rilevazione escalation / intent
│   ├── db/
│   │   └── (estensioni schema Drizzle, vedi §5)
│   └── templates/                         Template condivisi gestionale ↔ bot
└── db/
    └── schema/
        └── bot.ts                         wa_conversations, wa_threads, wa_templates_meta
```

**Deploy**: unico progetto Vercel `fior-di-loto-app`. Env var estese (vedi §10).

**Database**: unico Supabase `ixieormnmohexekoufnn`. Schema esteso via Drizzle migration.

## 4. Integrazione funzionale

### 4.1 Gestionale → Bot (outbound)

| Feature | Trigger | Endpoint |
|---|---|---|
| Invio manuale 1:1 | UI scheda cliente `clienti/[id]` → bottone "Invia WhatsApp" | `POST /api/whatsapp/send` |
| Promemoria appuntamento | Cron Vercel (o Supabase `pg_cron`), 24h e 2h prima | Job serverless interno |
| Campagna marketing | Modulo `marketing/campagne` esistente, nuovo canale WA | Batch async con rate limit Meta |
| Notifica escalation | Bot rileva intent → notifica Laura + dashboard | n8n mantenuto o sostituito con push interno |

### 4.2 Bot → Gestionale (inbound)

1. Webhook Meta POST → verifica firma HMAC (`X-Hub-Signature-256` + `META_WA_APP_SECRET`)
2. Risposta 200 immediata, processing async
3. Lookup/upsert `clients` per `phone` (no duplicati con tabella cliente esistente)
4. Append messaggio in `wa_conversations` legato a `clients.id`
5. Buffer 4s per aggregare messaggi rapidi consecutivi (tabella `wa_message_buffer` con TTL cleanup, necessaria perché serverless Vercel non ha memoria persistente tra invocazioni)
6. Chiamata Claude con cronologia + system prompt Marialucia
7. Rileva intent: se booking → crea `appuntamenti` con `source='bot'`, `status='pending_review'` (approvazione manuale obbligatoria per sicurezza)
8. Send risposta via Meta Cloud API con delay "umano" proporzionale alla lunghezza testo (pattern `sendWithTyping`)

## 5. Schema database

Nuovo file `src/db/schema/bot.ts` (Drizzle):

```ts
wa_conversations (
  id uuid pk,
  client_id uuid fk → clients.id,
  role text ('user'|'assistant'|'system'),
  content text,
  meta_message_id text,
  created_at timestamptz default now()
)

wa_threads (
  id uuid pk,
  client_id uuid fk → clients.id unique,
  last_message_at timestamptz,
  status text ('active'|'archived'|'escalated'),
  assigned_to uuid fk → auth.users.id nullable,
  unread_count int default 0
)

wa_templates_meta (
  id uuid pk,
  meta_template_name text unique,
  category text ('marketing'|'utility'|'authentication'),
  language text default 'it',
  body text,
  approved_at timestamptz
)

wa_message_buffer (
  id uuid pk,
  phone text,
  content text,
  received_at timestamptz default now(),
  processed_at timestamptz nullable
)
-- cleanup: job cron elimina righe con processed_at IS NOT NULL e > 1h
```

Estensione tabella `clients` esistente (migration additiva, colonne nullable):
- `wa_opt_in boolean default false`
- `wa_last_seen timestamptz`
- `wa_phone_verified boolean default false`

RLS: `service_role` write, `authenticated` read per dashboard gestionale.

## 6. Provider switch 360dialog → Meta WhatsApp Cloud API

### 6.1 Nuovo client `src/lib/bot/whatsapp-meta.ts`

```ts
sendMessage(to: string, body: string | MetaTemplate): Promise<MetaMessageId>
verifyWebhook(mode: string, token: string, challenge: string): string | null
parseInbound(payload: MetaWebhookPayload): NormalizedMessage[]
verifySignature(rawBody: string, signature: string, appSecret: string): boolean
```

Endpoint Graph API: `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
Header: `Authorization: Bearer {META_WA_ACCESS_TOKEN}`

### 6.2 Porting numero WhatsApp (operazione utente, 2-5gg)

1. Meta Business Manager → WhatsApp Manager → Aggiungi numero
2. Richiedi `migration-token` su portale 360dialog
3. POST `graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/request_code` (PIN SMS/voice)
4. POST `...verify_code` con PIN ricevuto
5. Configura webhook su Meta: `https://fior-di-loto-app.vercel.app/api/whatsapp/webhook` + verify token
6. Subscribe eventi `messages`

### 6.3 Rate limit e retry

Meta Cloud API: 80 msg/s business-initiated, 1000 conversazioni/mese gratuite.
Implementazione: exponential backoff (1s, 2s, 4s, max 3 retry), queue interna in `wa_send_queue` se necessario per broadcast >50 destinatari.

## 7. Asset salvati dal bot esistente

### 7.1 System prompt Marialucia (asset più prezioso)

Estratto integrale da `Bot_Marialucia/marialucia/lib/claude.js`, destinazione `src/lib/bot/marialucia-system-prompt.ts` come costante esportata. Mantiene tono, flow conversazione, gestione obiezioni, KB Fior di Loto.

Riassunto contenuto:
- Ruolo: assistente WhatsApp di Laura Ruta
- Obiettivo: qualificare cliente e portare a call 15 min
- Tono: caloroso, tu, max 2-3 righe, 1-2 emoji max
- Flow: apertura → qualificazione (1 domanda alla volta) → proposta Metodo Rinascita → CTA call
- Obiezioni: tempo, "ho provato tutto", prezzo, "ci devo pensare"
- KB: centro Campobasso, target donne 40+, flagship Metodo Rinascita

### 7.2 Pattern riutilizzabili

| Origine | Destinazione | Cosa |
|---|---|---|
| `lib/buffer.js` | `src/lib/bot/message-buffer.ts` | Aggregazione 4s messaggi multipli — **ADATTARE** da Map in-memory a tabella `wa_message_buffer` (serverless non ha stato in-memory persistente) |
| `lib/whatsapp.js::sendWithTyping` | `src/lib/bot/whatsapp-meta.ts::sendWithHumanDelay` | Delay proporzionale lunghezza testo |
| `api/webhook.js` | `src/app/api/whatsapp/webhook/route.ts` | HMAC verify → 200 immediate → async processing |
| `lib/calendar.js` | `src/lib/bot/booking.ts` | Query busy-slots, filter 09:00-19:00, granularità 30min — **RIMAPPARE** da Google Calendar a tabella `appuntamenti` gestionale |
| `supabase/schema.sql` RLS | nuove migrations Drizzle | Policy `service_role_only_*`, funzione cleanup ultimi 50 msg |

### 7.3 Da scartare definitivamente

- Client 360dialog (`lib/whatsapp.js` corpo) — sostituito da Meta Cloud API
- Dipendenza `googleapis` — non serve più (usiamo agenda interna)
- File `vercel.json` del bot — deploy unico usa il gestionale
- Directory `Bot_Marialucia/marialucia/dashboard/` se presente — la dashboard vive ora in `src/app/(app)/bot/`

## 8. Cutover plan

1. Branch `feat/bot-fusion` da `main` del gestionale
2. Implementazione schema DB + migration Drizzle
3. Implementazione `src/lib/bot/*` completa + API routes
4. Implementazione dashboard `src/app/(app)/bot/*`
5. Test locale con ngrok + Meta Test Number
6. Deploy preview Vercel → test end-to-end su staging branch
7. **Gate operativo**: porting numero produzione completato (§6.2)
8. Merge `feat/bot-fusion` → `main`, deploy production
9. Swap webhook Meta al nuovo URL production
10. Monitor 48h: log Vercel, tabella `wa_conversations`, error rate

## 9. Testing

- Unit: `intent.ts`, `message-buffer.ts`, `booking.ts` (logica pura, facile da testare)
- Integration: webhook → parse → save → risposta AI, mockando Anthropic e Meta API
- E2E manuale: Meta Test Number → invia messaggio reale → verifica dashboard
- Smoke production: conversazione test con numero personale subito dopo cutover

## 10. Env vars

Nuove (da aggiungere a `.env.local` locale + Vercel production):

```
META_WA_PHONE_NUMBER_ID=
META_WA_ACCESS_TOKEN=
META_WA_APP_SECRET=
META_WA_VERIFY_TOKEN=
META_WA_BUSINESS_ACCOUNT_ID=
ANTHROPIC_API_KEY=
BOT_SEND_BEARER_TOKEN=              # protezione POST /api/whatsapp/send
```

Secrets location locale: `fior-di-loto-app/.secrets/meta-wa.env` (gitignored, coerente con convenzione esistente `meta-marketing-api.env`).

## 11. Cleanup post-migration

- Archivia `01_Progetti_Attivi/Bot_Marialucia/` in `_archivio/Bot_Marialucia_pre-fusion_2026-04/`
- Delete manuale progetto Supabase `yyiasimarhipaeyzjipz` dalla dashboard (già in pausa)
- Aggiorna memoria `project_fior_di_loto.md` con nuova architettura fusa
- Aggiorna `project_fior_di_loto_deploy.md` con nuove env Meta WA
- Rimuovi memoria `Bot_Marialucia` se esisteva (non presente attualmente)

## 12. Rischi e mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Porting numero 360dialog → Meta richiede downtime | Medio | Cutover di notte, avvisare clienti via IG/sito se >1h |
| Meta Cloud API richiede template pre-approvati per messaggi business-initiated | Medio | Sottomettere template promemoria appuntamento prima del cutover |
| AI bot genera prenotazioni errate | Medio | `status='pending_review'` obbligatorio, approvazione manuale dashboard |
| Messaggi persi durante swap webhook | Basso | Finestra cutover breve (~5 min), clienti in arrivo riceveranno risposta AI al re-invio |
| Env var Meta errate in produzione | Alto | Test completo su Preview Vercel con numero test prima di toccare production |
| Sovraccarico Anthropic costo | Basso | Modello `claude-sonnet-4-6` (non `opus`), cronologia limitata ultimi 50 msg, cache prompt sistema |

## 13. Fuori scope (esplicitato)

- Riscrittura moduli esistenti del gestionale (clienti, agenda, ecc.) — restano invariati
- Migrazione altri canali (Instagram DM, Telegram, webchat) — possibile futura estensione
- Sostituzione n8n — valutata solo se post-fusione diventa overhead; per ora mantenuto
- Multi-lingua — italiano only, coerente con target
