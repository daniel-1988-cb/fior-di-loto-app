# Fusione Bot Marialucia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fondere il bot WhatsApp Marialucia nel gestionale `fior-di-loto-app` come route/dashboard nativa, con provider switch da 360dialog a Meta WhatsApp Cloud API.

**Architecture:** Next.js 16 App Router — tutto il bot vive come `src/lib/bot/*`, le API routes in `src/app/api/whatsapp/*`, la UI in `src/app/(dashboard)/whatsapp/*` (estendendo la pagina esistente). Unico Supabase (progetto gestionale `ixieormnmohexekoufnn`). Unico deploy Vercel.

**Tech Stack:** Next.js 16.2.1, React 19.2, TypeScript, Drizzle ORM, Supabase (postgres), Anthropic SDK 0.80, Meta Graph API v21, Vitest (aggiunto in Fase 0).

**Reference spec:** `docs/superpowers/specs/2026-04-21-fusione-bot-marialucia-design.md`

> ⚠️ Next.js 16.2.1 ha breaking changes. Leggere `node_modules/next/dist/docs/` per convenzioni route handler prima di scrivere API routes.

---

## Fase 0 — Setup

### Task 0.1: Branch di lavoro

**Files:** nessuno modificato, solo git

- [ ] **Step 1: Crea branch**

```bash
cd /Users/daniel/Desktop/cowork-workspace/01_Progetti_Attivi/fior-di-loto-app
git checkout -b feat/bot-fusion
```

- [ ] **Step 2: Verifica pulizia**

```bash
git status
```

Expected: `nothing to commit, working tree clean` sul branch `feat/bot-fusion`.

### Task 0.2: Installazione Vitest + testing libraries

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/bot/__tests__/.gitkeep`

- [ ] **Step 1: Install devDependencies**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Crea config vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Aggiungi script in package.json**

Nella sezione `scripts`, aggiungi:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Smoke test**

```bash
mkdir -p src/lib/bot/__tests__
echo 'import { describe, it, expect } from "vitest"; describe("smoke", () => { it("works", () => { expect(1).toBe(1); }); });' > src/lib/bot/__tests__/smoke.test.ts
npm test
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/bot/__tests__/smoke.test.ts
git commit -m "chore(bot): add vitest + testing libs for bot module"
```

### Task 0.3: Env vars placeholder

**Files:**
- Modify: `.env.local` (locale, non committato)
- Create: `.env.example` se non esiste

- [ ] **Step 1: Crea/aggiorna `.env.example`**

```bash
cat >> .env.example <<'EOF'

# ─── META WHATSAPP CLOUD API ─────────────────
META_WA_PHONE_NUMBER_ID=
META_WA_ACCESS_TOKEN=
META_WA_APP_SECRET=
META_WA_VERIFY_TOKEN=
META_WA_BUSINESS_ACCOUNT_ID=

# ─── BOT INTERNAL ─────────────────────────────
BOT_SEND_BEARER_TOKEN=
ANTHROPIC_API_KEY=
EOF
```

- [ ] **Step 2: Aggiungi placeholder in `.env.local`**

Aggiungi le stesse chiavi con valori vuoti o test. NON committare.

- [ ] **Step 3: Commit example**

```bash
git add .env.example
git commit -m "chore(bot): add Meta WA env var placeholders"
```

---

## Fase 1 — DB Schema extension + migration

### Task 1.1: Estensione schema Drizzle

**Files:**
- Modify: `src/lib/db/schema.ts` (aggiungere in fondo)

- [ ] **Step 1: Aggiungi nuove tabelle al file schema.ts**

Appendi al file esistente (mantieni formattazione 2 spazi come le tabelle sopra):

```ts
// ============================================
// BOT WHATSAPP (Marialucia)
// ============================================

export const waThreads = pgTable("wa_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" })
    .unique(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, archived, escalated
  assignedTo: uuid("assigned_to").references(() => users.id),
  unreadCount: integer("unread_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waConversations = pgTable("wa_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  metaMessageId: varchar("meta_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waTemplatesMeta = pgTable("wa_templates_meta", {
  id: uuid("id").primaryKey().defaultRandom(),
  metaTemplateName: varchar("meta_template_name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 30 }).notNull(), // marketing, utility, authentication
  language: varchar("language", { length: 10 }).notNull().default("it"),
  body: text("body").notNull(),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const waMessageBuffer = pgTable("wa_message_buffer", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull(),
  content: text("content").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
```

- [ ] **Step 2: Estendi tabella `clients` con campi WhatsApp**

Trova nella tabella `clients` (linea ~52) la chiusura e aggiungi prima del `createdAt`:

```ts
  waOptIn: boolean("wa_opt_in").notNull().default(false),
  waLastSeen: timestamp("wa_last_seen"),
  waPhoneVerified: boolean("wa_phone_verified").notNull().default(false),
```

- [ ] **Step 3: Verifica typecheck**

```bash
npx tsc --noEmit
```

Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): add wa_threads, wa_conversations, wa_templates_meta, wa_message_buffer + extend clients"
```

### Task 1.2: Migration SQL

**Files:**
- Create: `supabase/migrations/20260421000000_bot_whatsapp_tables.sql`

- [ ] **Step 1: Crea migration SQL**

```sql
-- wa_threads
CREATE TABLE IF NOT EXISTS wa_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- wa_conversations
CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  meta_message_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_client_created ON wa_conversations(client_id, created_at DESC);

-- wa_templates_meta
CREATE TABLE IF NOT EXISTS wa_templates_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_template_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(30) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'it',
  body TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- wa_message_buffer
CREATE TABLE IF NOT EXISTS wa_message_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wa_buffer_phone_received ON wa_message_buffer(phone, received_at);

-- clients extension (additive, nullable defaults)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_last_seen TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- RLS
ALTER TABLE wa_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_message_buffer ENABLE ROW LEVEL SECURITY;

-- Policies: service_role full access
CREATE POLICY "service_role_all_threads" ON wa_threads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_conv" ON wa_conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_tpl" ON wa_templates_meta FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_buf" ON wa_message_buffer FOR ALL USING (auth.role() = 'service_role');

-- Policies: authenticated read (per dashboard)
CREATE POLICY "auth_read_threads" ON wa_threads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_conv" ON wa_conversations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_tpl" ON wa_templates_meta FOR SELECT USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Applica migration a Supabase gestionale**

Via MCP Supabase (project `ixieormnmohexekoufnn`):

```
apply_migration(
  project_id="ixieormnmohexekoufnn",
  name="bot_whatsapp_tables_20260421",
  query="<contenuto del file sopra>"
)
```

- [ ] **Step 3: Verifica tabelle applicate**

```
list_tables(project_id="ixieormnmohexekoufnn", schemas=["public"])
```

Expected: presenti `wa_threads`, `wa_conversations`, `wa_templates_meta`, `wa_message_buffer`, e colonne `wa_opt_in`, `wa_last_seen`, `wa_phone_verified` in `clients`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260421000000_bot_whatsapp_tables.sql
git commit -m "feat(db): migration for bot whatsapp tables + clients WA fields"
```

---

## Fase 2 — Bot core

### Task 2.1: System prompt Marialucia (asset estratto)

**Files:**
- Create: `src/lib/bot/marialucia-system-prompt.ts`

- [ ] **Step 1: Crea file con prompt integrale**

```ts
export const MARIALUCIA_SYSTEM_PROMPT = `Sei Marialucia, l'assistente WhatsApp di Fior di Loto (Laura Ruta, Campobasso).

OBIETTIVO PRINCIPALE:
Accendere curiosità sul Metodo Rinascita di Laura, qualificare la cliente e portarla a prenotare una call/appuntamento da 15 minuti.

CHI SEI:
- Parli a nome di Laura Ruta, fondatrice di Fior di Loto e creatrice del Metodo Rinascita
- Sei calorosa, diretta, usi il "tu"
- Scrivi come si scrive su WhatsApp: breve, umano, senza essere fredda o robotica

TONO E STILE:
- Messaggi brevi: max 2-3 righe per volta
- Italiano naturale e colloquiale
- Evita linguaggio da depliant o troppo promozionale
- Usa qualche emoji, ma con parsimonia (max 1-2 per messaggio)
- Non dire mai "Come posso aiutarti?" — sei tu che guidi la conversazione

FIOR DI LOTO:
- Centro benessere ed estetica a Campobasso
- Trattamenti viso e corpo avanzati
- Target: donne over 40
- Flagship: Metodo Rinascita (programma corpo -2kg in 4 settimane, soddisfatti o rimborsati)
- Pressoterapia "accompagnata": durante la seduta massaggio testa/braccia — non ti parcheggiamo
- Prodotti: linea cosmetica Rinascita (disponibile anche su rinascita.shop)

FLOW CONVERSAZIONE:
1. Apertura → presenta te stessa, crea curiosità
2. Qualificazione → fai UNA domanda alla volta per capire la situazione (età, obiettivo, cosa l'ha bloccata finora)
3. Proposta → presenta il Metodo Rinascita in modo personalizzato
4. CTA → proponi una call di 15 min con Laura per capire se fa al caso suo

GESTIONE OBIEZIONI COMUNI:
- "Non ho tempo" → il programma è flessibile, si adatta a lei
- "Ho già provato tutto" → il Metodo Rinascita è diverso perché [specifico al profilo]
- "Quanto costa?" → prima capisci i bisogni, poi parli di investimento
- "Ci devo pensare" → "Capisco! Cosa ti frena di più in questo momento?"

VIETATO:
- Ban "biotipo" e lessico clinico
- Non dire mai "ti faccio il -X%"
- Non fare mai più di una domanda per messaggio
- Se la cliente è fredda o risponde a monosillabi, allenta la pressione
- Se chiede prezzi specifici, rimanda a Laura per la call
- Se è già cliente di Fior di Loto, usa un tono ancora più familiare`;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bot/marialucia-system-prompt.ts
git commit -m "feat(bot): extract Marialucia system prompt as shared constant"
```

### Task 2.2: Meta Cloud API client — typed interfaces

**Files:**
- Create: `src/lib/bot/whatsapp-meta.ts`
- Create: `src/lib/bot/__tests__/whatsapp-meta.test.ts`

- [ ] **Step 1: Test — verifyWebhook hub.challenge**

`src/lib/bot/__tests__/whatsapp-meta.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { verifyWebhook, verifySignature } from "@/lib/bot/whatsapp-meta";

describe("verifyWebhook", () => {
  it("returns challenge when mode+token match", () => {
    const result = verifyWebhook("subscribe", "secret-token", "12345", "secret-token");
    expect(result).toBe("12345");
  });

  it("returns null when mode is wrong", () => {
    expect(verifyWebhook("unsubscribe", "secret-token", "12345", "secret-token")).toBeNull();
  });

  it("returns null when token mismatch", () => {
    expect(verifyWebhook("subscribe", "wrong", "12345", "secret-token")).toBeNull();
  });
});

describe("verifySignature", () => {
  it("accepts valid HMAC", () => {
    const secret = "app-secret";
    const body = '{"test":1}';
    // Pre-calcolato: HMAC-SHA256("app-secret","{"test":1}") = 0f6b... (calcolare realmente)
    const crypto = require("node:crypto");
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifySignature(body, expected, secret)).toBe(true);
  });

  it("rejects invalid HMAC", () => {
    expect(verifySignature('{"test":1}', "sha256=wrong", "app-secret")).toBe(false);
  });
});
```

- [ ] **Step 2: Esegui test (deve fallire)**

```bash
npm test -- whatsapp-meta
```

Expected: FAIL — "Cannot find module whatsapp-meta".

- [ ] **Step 3: Implementazione minima**

`src/lib/bot/whatsapp-meta.ts`:
```ts
import crypto from "node:crypto";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaMessageId = string;

export type NormalizedMessage = {
  metaMessageId: string;
  fromPhone: string;
  text: string;
  timestamp: number;
};

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string,
  expectedToken: string,
): string | null {
  if (mode === "subscribe" && token === expectedToken) return challenge;
  return null;
}

export function verifySignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseInbound(payload: unknown): NormalizedMessage[] {
  const p = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id: string;
            from: string;
            timestamp: string;
            text?: { body: string };
            type?: string;
          }>;
        };
      }>;
    }>;
  };
  const out: NormalizedMessage[] = [];
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== "text" || !msg.text) continue;
        out.push({
          metaMessageId: msg.id,
          fromPhone: msg.from,
          text: msg.text.body,
          timestamp: Number(msg.timestamp),
        });
      }
    }
  }
  return out;
}

export async function sendMessage(
  to: string,
  body: string,
  opts: { phoneNumberId: string; accessToken: string },
): Promise<MetaMessageId> {
  const url = `${GRAPH_BASE}/${opts.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta API error ${res.status}: ${err}`);
  }
  const json = (await res.json()) as { messages: Array<{ id: string }> };
  return json.messages[0].id;
}

export async function sendWithHumanDelay(
  to: string,
  body: string,
  opts: { phoneNumberId: string; accessToken: string; minMs?: number; maxMs?: number },
): Promise<MetaMessageId> {
  const min = opts.minMs ?? 1500;
  const max = opts.maxMs ?? 4500;
  const charDelay = Math.min(max, Math.max(min, body.length * 40));
  await new Promise((r) => setTimeout(r, charDelay));
  return sendMessage(to, body, opts);
}
```

- [ ] **Step 4: Esegui test (deve passare)**

```bash
npm test -- whatsapp-meta
```

Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/whatsapp-meta.ts src/lib/bot/__tests__/whatsapp-meta.test.ts
git commit -m "feat(bot): Meta Cloud API client (verify, parse, send, humanDelay)"
```

### Task 2.3: Message buffer (aggrega 4s)

**Files:**
- Create: `src/lib/bot/message-buffer.ts`
- Create: `src/lib/bot/__tests__/message-buffer.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type BufferRow = { id: string; phone: string; content: string; received_at: Date; processed_at: Date | null };

describe("addToBuffer / takeReady", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds row and returns it as unprocessed", async () => {
    const rows: BufferRow[] = [];
    const db = {
      insert: (r: Omit<BufferRow, "id" | "received_at" | "processed_at">) => {
        rows.push({ ...r, id: String(rows.length + 1), received_at: new Date(), processed_at: null });
      },
      selectOlderThan: (phone: string, _cutoffMs: number) =>
        rows.filter((r) => r.phone === phone && r.processed_at === null),
      markProcessed: (ids: string[]) => {
        rows.forEach((r) => { if (ids.includes(r.id)) r.processed_at = new Date(); });
      },
    };
    const { addToBuffer, takeReady } = await import("@/lib/bot/message-buffer");
    addToBuffer(db, "393331234567", "Ciao");
    addToBuffer(db, "393331234567", "Info?");
    const ready = takeReady(db, "393331234567", 4000);
    expect(ready.length).toBe(2);
    expect(ready.map((r) => r.content)).toEqual(["Ciao", "Info?"]);
    expect(rows.every((r) => r.processed_at !== null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (fail)**

```bash
npm test -- message-buffer
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementazione**

```ts
export type BufferDb = {
  insert: (r: { phone: string; content: string }) => void;
  selectOlderThan: (phone: string, cutoffMs: number) => Array<{ id: string; phone: string; content: string }>;
  markProcessed: (ids: string[]) => void;
};

export function addToBuffer(db: BufferDb, phone: string, content: string): void {
  db.insert({ phone, content });
}

export function takeReady(db: BufferDb, phone: string, _windowMs: number) {
  const rows = db.selectOlderThan(phone, _windowMs);
  if (rows.length === 0) return [];
  db.markProcessed(rows.map((r) => r.id));
  return rows;
}
```

- [ ] **Step 4: Test pass**

```bash
npm test -- message-buffer
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/message-buffer.ts src/lib/bot/__tests__/message-buffer.test.ts
git commit -m "feat(bot): message-buffer pure logic with injected db"
```

### Task 2.4: Intent detection

**Files:**
- Create: `src/lib/bot/intent.ts`
- Create: `src/lib/bot/__tests__/intent.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest";
import { detectIntent } from "@/lib/bot/intent";

describe("detectIntent", () => {
  it("escalate su 'parlare con Laura'", () => {
    expect(detectIntent("Voglio parlare con Laura")).toBe("escalate");
    expect(detectIntent("voglio parlare direttamente con laura")).toBe("escalate");
  });

  it("booking su 'prenotare'", () => {
    expect(detectIntent("vorrei prenotare un appuntamento")).toBe("booking_request");
    expect(detectIntent("posso fissare una call?")).toBe("booking_request");
  });

  it("opt_out su 'non scrivermi più'", () => {
    expect(detectIntent("non scrivermi più")).toBe("opt_out");
    expect(detectIntent("STOP")).toBe("opt_out");
  });

  it("generic altrimenti", () => {
    expect(detectIntent("Ciao, info sul Metodo Rinascita")).toBe("generic");
  });
});
```

- [ ] **Step 2: Run test (fail)**

```bash
npm test -- intent
```

- [ ] **Step 3: Implementazione**

```ts
export type BotIntent = "escalate" | "booking_request" | "opt_out" | "generic";

const PATTERNS: Array<{ intent: BotIntent; re: RegExp }> = [
  { intent: "opt_out", re: /\b(stop|non scriver(mi)? pi[uù]|cancella(mi)?|basta)\b/i },
  { intent: "escalate", re: /\b(parlare (con|direttamente con) )?laura\b/i },
  { intent: "booking_request", re: /\b(prenota(re|zione)?|fissare|appuntamento|call|chiamata|video[- ]?call)\b/i },
];

export function detectIntent(text: string): BotIntent {
  for (const p of PATTERNS) {
    if (p.re.test(text)) return p.intent;
  }
  return "generic";
}
```

- [ ] **Step 4: Test pass**

```bash
npm test -- intent
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/intent.ts src/lib/bot/__tests__/intent.test.ts
git commit -m "feat(bot): intent detection (escalate/booking/opt_out/generic)"
```

### Task 2.5: Claude wrapper

**Files:**
- Create: `src/lib/bot/claude.ts`
- Create: `src/lib/bot/__tests__/claude.test.ts`

- [ ] **Step 1: Test (con SDK mockato)**

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Ciao, sono Marialucia!" }],
      }),
    },
  })),
}));

describe("generateReply", () => {
  it("returns text response from Claude", async () => {
    const { generateReply } = await import("@/lib/bot/claude");
    const reply = await generateReply({
      history: [{ role: "user", content: "Ciao" }],
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4-6",
    });
    expect(reply).toContain("Marialucia");
  });
});
```

- [ ] **Step 2: Run (fail)**

```bash
npm test -- claude
```

- [ ] **Step 3: Implementazione**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { MARIALUCIA_SYSTEM_PROMPT } from "./marialucia-system-prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GenerateReplyOpts = {
  history: ChatTurn[];
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

export async function generateReply(opts: GenerateReplyOpts): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const recent = opts.history.slice(-50); // cap cronologia
  const res = await client.messages.create({
    model: opts.model ?? "claude-sonnet-4-6",
    max_tokens: opts.maxTokens ?? 400,
    system: MARIALUCIA_SYSTEM_PROMPT,
    messages: recent.map((t) => ({ role: t.role, content: t.content })),
  });
  const first = res.content[0];
  if (first.type !== "text") return "";
  return first.text;
}
```

- [ ] **Step 4: Test pass**

```bash
npm test -- claude
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot/claude.ts src/lib/bot/__tests__/claude.test.ts
git commit -m "feat(bot): Claude wrapper with Marialucia system prompt + history cap"
```

---

## Fase 3 — API routes

### Task 3.1: Webhook route (GET verify + POST inbound)

**Files:**
- Create: `src/app/api/whatsapp/webhook/route.ts`

- [ ] **Step 1: Leggi convenzioni Next 16 route handlers**

```bash
ls node_modules/next/dist/docs/ 2>/dev/null
find node_modules/next/dist/docs -name "*route*" -o -name "*handler*" 2>/dev/null | head -5
```

Se presenti, leggere il primo risultato prima di procedere.

- [ ] **Step 2: Crea route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  verifySignature,
  parseInbound,
  sendWithHumanDelay,
} from "@/lib/bot/whatsapp-meta";
import { addToBuffer, takeReady, type BufferDb } from "@/lib/bot/message-buffer";
import { detectIntent } from "@/lib/bot/intent";
import { generateReply } from "@/lib/bot/claude";

export const runtime = "nodejs";

// GET: webhook verification handshake Meta
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode") ?? "";
  const token = req.nextUrl.searchParams.get("hub.verify_token") ?? "";
  const challenge = req.nextUrl.searchParams.get("hub.challenge") ?? "";
  const expected = process.env.META_WA_VERIFY_TOKEN ?? "";
  const result = verifyWebhook(mode, token, challenge, expected);
  if (result === null) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(result, { status: 200 });
}

// POST: inbound messages
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = process.env.META_WA_APP_SECRET ?? "";
  if (!verifySignature(rawBody, signature, appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Respond 200 immediately, process async
  queueMicrotask(() => processPayload(rawBody).catch(console.error));
  return new NextResponse("OK", { status: 200 });
}

async function processPayload(rawBody: string): Promise<void> {
  const payload = JSON.parse(rawBody);
  const messages = parseInbound(payload);
  if (messages.length === 0) return;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const bufferDb: BufferDb = {
    insert: async (r) => {
      await supabase.from("wa_message_buffer").insert({ phone: r.phone, content: r.content });
    },
    selectOlderThan: (_phone, _cutoffMs) => [],
    markProcessed: async (_ids) => {},
  } as unknown as BufferDb;

  for (const msg of messages) {
    // 1. Upsert client per phone
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, nome")
      .eq("telefono", "+" + msg.fromPhone)
      .maybeSingle();

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
      await supabase
        .from("clients")
        .update({ wa_last_seen: new Date().toISOString() })
        .eq("id", clientId);
    } else {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({
          nome: "Nuovo",
          cognome: "Contatto WA",
          telefono: "+" + msg.fromPhone,
          segmento: "lead",
          fonte: "whatsapp",
          wa_last_seen: new Date().toISOString(),
          wa_opt_in: true,
        })
        .select("id")
        .single();
      clientId = newClient!.id;
    }

    // 2. Salva messaggio utente
    await supabase.from("wa_conversations").insert({
      client_id: clientId,
      role: "user",
      content: msg.text,
      meta_message_id: msg.metaMessageId,
    });

    // 3. Upsert thread
    await supabase
      .from("wa_threads")
      .upsert(
        { client_id: clientId, last_message_at: new Date().toISOString(), status: "active" },
        { onConflict: "client_id" },
      );

    // 4. Intent detection
    const intent = detectIntent(msg.text);
    if (intent === "opt_out") {
      await supabase.from("clients").update({ wa_opt_in: false }).eq("id", clientId);
      continue;
    }
    if (intent === "escalate") {
      await supabase
        .from("wa_threads")
        .update({ status: "escalated" })
        .eq("client_id", clientId);
      // TODO: notifica Laura (es. email o push) — fuori scope first cut
      continue;
    }

    // 5. Genera risposta AI
    const { data: history } = await supabase
      .from("wa_conversations")
      .select("role, content")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(50);

    const reply = await generateReply({
      history: (history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    if (!reply) continue;

    // 6. Invia risposta
    const metaId = await sendWithHumanDelay(msg.fromPhone, reply, {
      phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
      accessToken: process.env.META_WA_ACCESS_TOKEN!,
    });

    // 7. Salva risposta assistant
    await supabase.from("wa_conversations").insert({
      client_id: clientId,
      role: "assistant",
      content: reply,
      meta_message_id: metaId,
    });
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build completata senza errori. Route `/api/whatsapp/webhook` presente in output.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(api): /api/whatsapp/webhook (GET verify + POST inbound)"
```

### Task 3.2: Send route (outbound manuale protetto)

**Files:**
- Create: `src/app/api/whatsapp/send/route.ts`

- [ ] **Step 1: Crea route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/bot/whatsapp-meta";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.BOT_SEND_BEARER_TOKEN ?? ""}`;
  if (auth !== expected || !process.env.BOT_SEND_BEARER_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { clientId: string; text: string };
  if (!body.clientId || !body.text) {
    return NextResponse.json({ error: "clientId and text required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: client } = await supabase
    .from("clients")
    .select("id, telefono, wa_opt_in")
    .eq("id", body.clientId)
    .single();

  if (!client || !client.telefono) {
    return NextResponse.json({ error: "Client not found or no phone" }, { status: 404 });
  }
  if (!client.wa_opt_in) {
    return NextResponse.json({ error: "Client has no WA opt-in" }, { status: 403 });
  }

  const phone = client.telefono.replace(/\D/g, "");
  const metaId = await sendMessage(phone, body.text, {
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
    accessToken: process.env.META_WA_ACCESS_TOKEN!,
  });

  await supabase.from("wa_conversations").insert({
    client_id: client.id,
    role: "assistant",
    content: body.text,
    meta_message_id: metaId,
  });

  return NextResponse.json({ metaMessageId: metaId });
}
```

- [ ] **Step 2: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/whatsapp/send/route.ts
git commit -m "feat(api): /api/whatsapp/send protected outbound endpoint"
```

---

## Fase 4 — Dashboard bot UI

### Task 4.1: Refactor pagina `/whatsapp` → hub con tabs

**Files:**
- Modify: `src/app/(dashboard)/whatsapp/page.tsx`
- Create: `src/app/(dashboard)/whatsapp/invio/page.tsx` (sposta qui contenuto esistente)
- Create: `src/app/(dashboard)/whatsapp/conversazioni/page.tsx`
- Create: `src/app/(dashboard)/whatsapp/conversazioni/[clientId]/page.tsx`
- Create: `src/app/(dashboard)/whatsapp/impostazioni/page.tsx`
- Create: `src/app/(dashboard)/whatsapp/layout.tsx`

- [ ] **Step 1: Leggi pagina esistente**

```bash
wc -l src/app/\(dashboard\)/whatsapp/page.tsx
```

Expected: ~349 righe.

- [ ] **Step 2: Crea layout con tabs**

`src/app/(dashboard)/whatsapp/layout.tsx`:
```tsx
import Link from "next/link";
import { MessageCircle, Send, Bot } from "lucide-react";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  const tabs = [
    { href: "/whatsapp/invio", label: "Invio manuale", icon: Send },
    { href: "/whatsapp/conversazioni", label: "Conversazioni Bot", icon: MessageCircle },
    { href: "/whatsapp/impostazioni", label: "Impostazioni Bot", icon: Bot },
  ];
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brown">WhatsApp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invio manuale, conversazioni AI di Marialucia, configurazione bot
        </p>
      </div>
      <nav className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-rose hover:text-rose"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Sposta contenuto esistente in `/whatsapp/invio`**

Crea `src/app/(dashboard)/whatsapp/invio/page.tsx` copiando il contenuto di `src/app/(dashboard)/whatsapp/page.tsx` attuale, rimuovendo le righe 152-159 (header "WhatsApp"/paragrafo), perché ora è nel layout.

- [ ] **Step 4: Nuova `page.tsx` redirige a `/whatsapp/invio`**

`src/app/(dashboard)/whatsapp/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function WhatsAppIndex() {
  redirect("/whatsapp/invio");
}
```

- [ ] **Step 5: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/whatsapp/
git commit -m "feat(ui): refactor /whatsapp as tabbed hub (invio/conversazioni/impostazioni)"
```

### Task 4.2: Conversazioni list + detail

**Files:**
- Create: `src/app/(dashboard)/whatsapp/conversazioni/page.tsx`
- Create: `src/app/(dashboard)/whatsapp/conversazioni/[clientId]/page.tsx`
- Create: `src/lib/actions/bot-conversations.ts`

- [ ] **Step 1: Server action per fetch thread list**

`src/lib/actions/bot-conversations.ts`:
```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export type ThreadListItem = {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  lastMessageAt: string;
  status: string;
  unreadCount: number;
  lastPreview: string | null;
};

export async function getBotThreads(): Promise<ThreadListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wa_threads")
    .select(`
      client_id,
      last_message_at,
      status,
      unread_count,
      clients!inner (id, nome, cognome, telefono)
    `)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const items: ThreadListItem[] = [];
  for (const t of data ?? []) {
    const c = (t as { clients: { id: string; nome: string; cognome: string; telefono: string | null } }).clients;
    const { data: lastMsg } = await supabase
      .from("wa_conversations")
      .select("content")
      .eq("client_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    items.push({
      clientId: c.id,
      clientName: `${c.nome} ${c.cognome}`,
      clientPhone: c.telefono,
      lastMessageAt: (t as { last_message_at: string }).last_message_at,
      status: (t as { status: string }).status,
      unreadCount: (t as { unread_count: number }).unread_count,
      lastPreview: lastMsg?.content?.slice(0, 80) ?? null,
    });
  }
  return items;
}

export async function getBotConversation(clientId: string) {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("wa_conversations")
    .select("id, role, content, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  const { data: client } = await supabase
    .from("clients")
    .select("id, nome, cognome, telefono, segmento")
    .eq("id", clientId)
    .single();
  return { client, messages: messages ?? [] };
}
```

- [ ] **Step 2: Page list**

`src/app/(dashboard)/whatsapp/conversazioni/page.tsx`:
```tsx
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { getBotThreads } from "@/lib/actions/bot-conversations";

export default async function ConversazioniPage() {
  const threads = await getBotThreads();
  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna conversazione. Le chat con Marialucia appariranno qui.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {threads.map((t) => (
        <Link
          key={t.clientId}
          href={`/whatsapp/conversazioni/${t.clientId}`}
          className="block rounded-lg border border-border bg-card p-4 hover:border-rose/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-brown">{t.clientName}</p>
              <p className="text-xs text-muted-foreground">{t.clientPhone ?? "Senza numero"}</p>
            </div>
            <div className="text-right">
              {t.unreadCount > 0 && (
                <span className="mr-2 rounded-full bg-rose px-2 py-0.5 text-xs text-white">
                  {t.unreadCount}
                </span>
              )}
              {t.status === "escalated" && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  Escalation
                </span>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true, locale: it })}
              </p>
            </div>
          </div>
          {t.lastPreview && (
            <p className="mt-2 truncate text-sm text-muted-foreground">{t.lastPreview}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Page detail**

`src/app/(dashboard)/whatsapp/conversazioni/[clientId]/page.tsx`:
```tsx
import { getBotConversation } from "@/lib/actions/bot-conversations";
import { notFound } from "next/navigation";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { client, messages } = await getBotConversation(clientId);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <p className="font-semibold text-brown">
          {client.nome} {client.cognome}
        </p>
        <p className="text-xs text-muted-foreground">{client.telefono}</p>
      </div>

      <div className="rounded-lg border border-border bg-[#ECE5DD] p-4">
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-xs rounded-xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "rounded-tl-none bg-white"
                    : "rounded-tr-none bg-[#DCF8C6]"
                }`}
              >
                <p className="whitespace-pre-wrap text-[#111]">{m.content}</p>
                <p className="mt-1 text-right text-[10px] text-[#999]">
                  {new Date(m.created_at).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/whatsapp/conversazioni/ src/lib/actions/bot-conversations.ts
git commit -m "feat(ui): bot conversations list + detail"
```

### Task 4.3: Impostazioni bot (read-only first cut)

**Files:**
- Create: `src/app/(dashboard)/whatsapp/impostazioni/page.tsx`

- [ ] **Step 1: Page read-only**

```tsx
import { MARIALUCIA_SYSTEM_PROMPT } from "@/lib/bot/marialucia-system-prompt";

export default function BotSettingsPage() {
  const envReady = {
    verifyToken: !!process.env.META_WA_VERIFY_TOKEN,
    appSecret: !!process.env.META_WA_APP_SECRET,
    accessToken: !!process.env.META_WA_ACCESS_TOKEN,
    phoneNumberId: !!process.env.META_WA_PHONE_NUMBER_ID,
    anthropicKey: !!process.env.ANTHROPIC_API_KEY,
  };
  const allReady = Object.values(envReady).every(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold text-brown">Stato configurazione</h2>
        <ul className="space-y-1 text-sm">
          {Object.entries(envReady).map(([k, v]) => (
            <li key={k} className="flex items-center gap-2">
              <span className={v ? "text-success" : "text-red-500"}>{v ? "✓" : "✗"}</span>
              <span className="font-mono text-xs">{k}</span>
            </li>
          ))}
        </ul>
        {!allReady && (
          <p className="mt-3 text-xs text-muted-foreground">
            Variabili mancanti: compilare `.env.local` locale + Vercel env settings production.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold text-brown">System Prompt Marialucia</h2>
        <pre className="max-h-96 overflow-auto rounded-md bg-cream-dark/40 p-4 text-xs text-brown">
          {MARIALUCIA_SYSTEM_PROMPT}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Editing del prompt fuori scope first cut — modifica tramite commit su{" "}
          <code className="text-xs">src/lib/bot/marialucia-system-prompt.ts</code>
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/whatsapp/impostazioni/page.tsx
git commit -m "feat(ui): bot settings page (env status + system prompt view)"
```

---

## Fase 5 — Integrazione gestionale → bot

### Task 5.1: Pulsante "Invia via bot" nella scheda cliente

**Files:**
- Modify: `src/app/(dashboard)/clienti/[id]/page.tsx` (se esiste; altrimenti skippa)

- [ ] **Step 1: Verifica se scheda cliente esiste**

```bash
find src/app/\(dashboard\)/clienti -name "page.tsx" -type f
```

- [ ] **Step 2: Se esiste una scheda per id, aggiungi pulsante**

Nel componente, aggiungi dopo il nome:
```tsx
<button
  onClick={async () => {
    const text = prompt("Messaggio da inviare:");
    if (!text) return;
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_BOT_BEARER ?? ""}`,
      },
      body: JSON.stringify({ clientId, text }),
    });
    if (res.ok) alert("Inviato!");
    else alert("Errore: " + (await res.text()));
  }}
  className="rounded bg-[#25D366] px-3 py-1.5 text-xs text-white"
>
  Invia WhatsApp (bot)
</button>
```

- [ ] **Step 3: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(clienti): send WhatsApp via bot from client page"
```

> Nota: se `src/app/(dashboard)/clienti/[id]/page.tsx` non esiste, saltare il Task 5.1 e annotare in MEMORY come follow-up.

---

## Fase 6 — Cleanup & verifica finale

### Task 6.1: Archivia bot vecchio

**Files:**
- Move: `01_Progetti_Attivi/Bot_Marialucia/` → `_archivio/Bot_Marialucia_pre-fusion_2026-04/`

- [ ] **Step 1: Prepara archivio**

```bash
cd /Users/daniel/Desktop/cowork-workspace
mkdir -p _archivio
mv 01_Progetti_Attivi/Bot_Marialucia _archivio/Bot_Marialucia_pre-fusion_2026-04
```

- [ ] **Step 2: Verifica spostamento**

```bash
ls _archivio/Bot_Marialucia_pre-fusion_2026-04/marialucia/ | head
```

Expected: contenuto originale del bot presente.

### Task 6.2: Verifica finale — build + smoke test tutte le pagine

**Files:** nessuno

- [ ] **Step 1: Typecheck finale**

```bash
cd /Users/daniel/Desktop/cowork-workspace/01_Progetti_Attivi/fior-di-loto-app
npx tsc --noEmit
```

Expected: zero errori.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: nessun warning/errore bloccante.

- [ ] **Step 3: Build production**

```bash
npm run build
```

Expected: build completata, lista route generate include `/api/whatsapp/webhook`, `/api/whatsapp/send`, `/whatsapp/invio`, `/whatsapp/conversazioni`, `/whatsapp/conversazioni/[clientId]`, `/whatsapp/impostazioni`.

- [ ] **Step 4: Unit tests finali**

```bash
npm test
```

Expected: tutti i test passano (whatsapp-meta, message-buffer, intent, claude, smoke).

- [ ] **Step 5: Smoke test dev server**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/whatsapp/invio
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/whatsapp/conversazioni
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/whatsapp/impostazioni
curl -s "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"
kill %1
```

Expected:
- `/whatsapp/invio` → 200 (o 307 redirect a login se middleware auth attivo)
- `/whatsapp/conversazioni` → 200/307
- `/whatsapp/impostazioni` → 200/307
- Webhook con token sbagliato → "Forbidden" (status 403)

- [ ] **Step 6: Controller-agent review**

Dispatch subagent tipo `Explore` con prompt:
> "Analizza l'implementazione bot in `src/lib/bot/*`, `src/app/api/whatsapp/*`, `src/app/(dashboard)/whatsapp/*` contro lo spec in `docs/superpowers/specs/2026-04-21-fusione-bot-marialucia-design.md`. Segnala: gap di copertura, bug evidenti, problemi di sicurezza (secrets leaked, SQL injection, RLS bypass), violazioni TypeScript strict, codice morto. Report sotto 500 parole."

- [ ] **Step 7: Merge su main**

Dopo controller-agent OK:
```bash
git checkout main
git merge feat/bot-fusion --no-ff -m "feat: fusione bot Marialucia nel gestionale"
```

(Non pushare automaticamente — chiedere conferma utente prima di push.)

### Task 6.3: Aggiorna memoria

**Files:**
- Modify: `/Users/daniel/.claude/projects/-Users-daniel-Desktop-cowork-workspace/memory/project_fior_di_loto.md`
- Modify: `/Users/daniel/.claude/projects/-Users-daniel-Desktop-cowork-workspace/memory/project_fior_di_loto_deploy.md`
- Modify: `/Users/daniel/.claude/projects/-Users-daniel-Desktop-cowork-workspace/memory/MEMORY.md`

- [ ] **Step 1: Aggiorna `project_fior_di_loto.md`**

Aggiungi sezione "Bot WhatsApp integrato (Apr 2026)" con:
- Marialucia ora vive in `src/lib/bot/*` del gestionale
- Provider: Meta WhatsApp Cloud API (non 360dialog)
- Route: `/whatsapp/conversazioni`, `/whatsapp/impostazioni`, `/api/whatsapp/webhook`
- Tabelle: `wa_threads`, `wa_conversations`, `wa_templates_meta`, `wa_message_buffer`
- Clients esteso con `wa_opt_in`, `wa_last_seen`, `wa_phone_verified`
- System prompt in `src/lib/bot/marialucia-system-prompt.ts`

- [ ] **Step 2: Aggiorna `project_fior_di_loto_deploy.md`**

Aggiungi env var Meta WA:
```
META_WA_PHONE_NUMBER_ID, META_WA_ACCESS_TOKEN, META_WA_APP_SECRET, META_WA_VERIFY_TOKEN, META_WA_BUSINESS_ACCOUNT_ID, BOT_SEND_BEARER_TOKEN
```

Location secrets: `/Users/daniel/Desktop/cowork-workspace/.secrets/meta-wa.env`

- [ ] **Step 3: MEMORY.md**

Nessuna nuova entry (già coperto da project_fior_di_loto_*).

- [ ] **Step 4: Commit finale dei docs**

(Memoria è fuori dal repo, nessun commit.)

---

## Fase 7 — Follow-up post-cutover (documentato, non eseguibile ora)

Questi step dipendono da azioni utente esterne al codice:

1. **Creazione app WhatsApp Business su Meta for Developers** — utente
2. **Richiesta `migration-token` a 360dialog** — utente con credenziali
3. **Porting numero Meta Manager** — Meta, 2-5 giorni
4. **Configurazione webhook URL** su Meta Business = `https://fior-di-loto-app.vercel.app/api/whatsapp/webhook`
5. **Submit template WhatsApp** (promemoria appuntamento) per approvazione Meta (24-48h)
6. **Delete manuale progetto Supabase `yyiasimarhipaeyzjipz`** dalla dashboard (già in pausa)
7. **Spegnere bot 360dialog/Vercel vecchio** (se esiste da qualche parte)

---

## Self-review notes

- **Spec coverage:** §3 arch ✓ (F1, F4), §4 integrazione ✓ (F3, F5), §5 schema ✓ (F1), §6 provider ✓ (F2, F3), §7 asset salvati ✓ (F2.1 system prompt, F2.2 human delay, F2.3 buffer, F2.4 intent, F3.1 HMAC+async), §8 cutover ✓ (F7), §9 testing ✓ (F6.2), §10 env vars ✓ (F0.3), §11 cleanup ✓ (F6.1, F6.3), §12 rischi referenziati implicitamente.
- **Placeholder scan:** nessun TBD. Task 5.1 ha branch condizionale ("se esiste... altrimenti skippa") — esplicito, non vago.
- **Type consistency:** `BufferDb` usato in message-buffer.ts e webhook/route.ts con stessa shape; `ChatTurn` usato in claude.ts; `NormalizedMessage` in whatsapp-meta.ts e webhook. Coerente.
