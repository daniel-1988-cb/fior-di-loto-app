import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
  boolean,
  date,
  time,
  jsonb,
} from "drizzle-orm/pg-core";

// ============================================
// UTENTI & AUTH
// ============================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: uuid("auth_id").unique(), // Supabase Auth user ID
  nome: varchar("nome", { length: 100 }).notNull(),
  cognome: varchar("cognome", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  ruolo: varchar("ruolo", { length: 20 }).notNull().default("operatrice"), // admin, operatrice, receptionist
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// CRM - CLIENTI
// ============================================

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cognome: varchar("cognome", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 255 }),
  dataNascita: date("data_nascita"),
  indirizzo: text("indirizzo"),
  segmento: varchar("segmento", { length: 30 }).notNull().default("nuova"), // lotina, nuova, lead, inattiva, vip
  tags: jsonb("tags").$type<string[]>().default([]),
  note: text("note"),
  fonte: varchar("fonte", { length: 50 }), // instagram, whatsapp, passaparola, meta_ads, walk_in
  totaleSpeso: decimal("totale_speso", { precision: 10, scale: 2 }).default("0"),
  totaleVisite: integer("totale_visite").default(0),
  ultimaVisita: timestamp("ultima_visita"),
  waOptIn: boolean("wa_opt_in").notNull().default(false),
  waLastSeen: timestamp("wa_last_seen"),
  waPhoneVerified: boolean("wa_phone_verified").notNull().default(false),
  // Quick-action profile fields (client drawer "Attività" menu)
  avvisoPersonale: text("avviso_personale"),
  allergie: text("allergie"),
  patchTest: text("patch_test"),
  blocked: boolean("blocked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// INTERAZIONI CLIENTE (log unificato)
// ============================================

export const clientInteractions = pgTable("client_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 30 }).notNull(), // visita, messaggio, nota, trattamento, acquisto, chiamata
  descrizione: text("descrizione"),
  operatriceId: uuid("operatrice_id").references(() => users.id),
  importo: decimal("importo", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// SERVIZI & TRATTAMENTI
// ============================================

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  categoria: varchar("categoria", { length: 30 }).notNull(), // viso, corpo, massaggi, laser, spa
  descrizione: text("descrizione"),
  durata: integer("durata").notNull(), // minuti
  prezzo: decimal("prezzo", { precision: 10, scale: 2 }).notNull(),
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// PRODOTTI (Linea Rinascita)
// ============================================

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  categoria: varchar("categoria", { length: 50 }),
  descrizione: text("descrizione"),
  prezzo: decimal("prezzo", { precision: 10, scale: 2 }).notNull(),
  giacenza: integer("giacenza").notNull().default(0),
  sogliaAlert: integer("soglia_alert").default(5), // avviso scorte basse
  imageUrl: text("image_url"),
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// APPUNTAMENTI
// ============================================

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  operatriceId: uuid("operatrice_id").references(() => users.id),
  data: date("data").notNull(),
  oraInizio: time("ora_inizio").notNull(),
  oraFine: time("ora_fine").notNull(),
  stato: varchar("stato", { length: 20 }).notNull().default("confermato"), // confermato, completato, cancellato, no_show
  note: text("note"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  pagatoAt: timestamp("pagato_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// PERCORSI TRATTAMENTO
// ============================================

export const treatmentPrograms = pgTable("treatment_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descrizione: text("descrizione"),
  categoria: varchar("categoria", { length: 30 }),
  sedute: integer("sedute").notNull(),
  prezzo: decimal("prezzo", { precision: 10, scale: 2 }).notNull(),
  servizi: jsonb("servizi").$type<string[]>().default([]), // IDs dei servizi inclusi
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// TRANSAZIONI (Entrate/Uscite)
// ============================================

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id),
  tipo: varchar("tipo", { length: 20 }).notNull(), // entrata, uscita
  categoria: varchar("categoria", { length: 50 }), // servizio, prodotto, abbonamento, spesa_fissa, fornitore
  descrizione: text("descrizione"),
  importo: decimal("importo", { precision: 10, scale: 2 }).notNull(),
  metodoPagamento: varchar("metodo_pagamento", { length: 30 }), // contanti, carta, bonifico, satispay
  data: date("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// MESSAGGI (WhatsApp, Email)
// ============================================

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 100 }).notNull(),
  canale: varchar("canale", { length: 20 }).notNull(), // whatsapp, email
  contenuto: text("contenuto").notNull(), // con variabili tipo {{nome}}, {{servizio}}
  categoria: varchar("categoria", { length: 50 }), // conferma, promemoria, offerta, follow_up, auguri
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sentMessages = pgTable("sent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => messageTemplates.id),
  canale: varchar("canale", { length: 20 }).notNull(),
  contenuto: text("contenuto").notNull(),
  stato: varchar("stato", { length: 20 }).notNull().default("inviato"), // inviato, consegnato, letto, errore
  inviatoAt: timestamp("inviato_at").defaultNow().notNull(),
  inviatoDa: uuid("inviato_da").references(() => users.id),
});

// ============================================
// SOCIAL MEDIA
// ============================================

export const socialPosts = pgTable("social_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  piattaforma: varchar("piattaforma", { length: 20 }).notNull(), // instagram, facebook
  tipoContenuto: varchar("tipo_contenuto", { length: 30 }).notNull(), // reel_hook, educational, prima_dopo, connessione, prodotto
  titolo: varchar("titolo", { length: 200 }).notNull(),
  script: text("script"), // script del video/reel
  caption: text("caption"),
  hashtags: jsonb("hashtags").$type<string[]>().default([]),
  mediaUrl: text("media_url"),
  dataPubblicazione: timestamp("data_pubblicazione"),
  stato: varchar("stato", { length: 20 }).notNull().default("bozza"), // bozza, programmato, pubblicato
  keyword: varchar("keyword", { length: 50 }), // keyword per lead gen (es. RINASCITA, DETOX)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// ============================================
// RICHIESTE PRELIMINARI APPUNTAMENTI (dal bot)
// ============================================

export const appointmentRequests = pgTable("appointment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  testoRichiesta: text("testo_richiesta").notNull(),
  stato: varchar("stato", { length: 20 }).notNull().default("pending_review"), // pending_review, scheduled, rejected
  noteOperatore: text("note_operatore"),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const waBotDocuments = pgTable("wa_bot_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  titolo: varchar("titolo", { length: 200 }).notNull(),
  contenuto: text("contenuto").notNull(),
  categoria: varchar("categoria", { length: 50 }).notNull().default("generale"),
  attivo: boolean("attivo").notNull().default(true),
  ordine: integer("ordine").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// BLOCKED SLOTS (fasce orarie bloccate)
// ============================================
// NB: staff.id è gestita via raw SQL migration (vedi 005_staff.sql); non
// è modellata in Drizzle quindi qui non aggiungiamo la foreign key
// tipizzata — il vincolo FK è comunque presente a livello DB.

export const blockedSlots = pgTable("blocked_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id"),
  data: date("data").notNull(),
  oraInizio: time("ora_inizio").notNull(),
  oraFine: time("ora_fine").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull().default("personalizza"), // personalizza | formazione | ferie | pausa | altro
  titolo: text("titolo"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// TRANSACTION ITEMS (line items carrello checkout)
// ============================================

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(),
  refId: uuid("ref_id"),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  staffId: uuid("staff_id"),
  generatedVoucherId: uuid("generated_voucher_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// ABBONAMENTI (catalogo pacchetti ricorrenti)
// ============================================
// Template pacchetti vendibili: sedute totali, validità, servizi inclusi.
// Istanze vendute ai clienti vengono registrate in transaction_items con
// kind='abbonamento' (ref_id = subscriptions.id).

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descrizione: text("descrizione"),
  seduteTotali: integer("sedute_totali").notNull(),
  validitaGiorni: integer("validita_giorni"),
  prezzo: decimal("prezzo", { precision: 10, scale: 2 }).notNull(),
  serviziInclusi: jsonb("servizi_inclusi").$type<string[]>().default([]),
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// STAFF TURNI (planner settimanale)
// ============================================
// NB: staff è gestita via raw SQL migration (vedi 005_staff.sql) quindi
// non è modellata in Drizzle — il vincolo FK resta comunque a livello DB.

export const staffTurni = pgTable("staff_turni", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").notNull(),
  data: date("data").notNull(),
  oraInizio: time("ora_inizio").notNull(),
  oraFine: time("ora_fine").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// STAFF PRESENZE (clock in/out)
// ============================================

export const staffPresenze = pgTable("staff_presenze", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").notNull(),
  data: date("data").notNull(),
  clockIn: timestamp("clock_in", { withTimezone: true }).defaultNow().notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// FORNITORI & ORDINI DI STOCK (Fase 2.5)
// ============================================

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: varchar("nome", { length: 200 }).notNull(),
  partitaIva: varchar("partita_iva", { length: 20 }),
  codiceFiscale: varchar("codice_fiscale", { length: 20 }),
  email: varchar("email", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  indirizzo: text("indirizzo"),
  referente: text("referente"),
  note: text("note"),
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  numeroOrdine: varchar("numero_ordine", { length: 50 }),
  dataOrdine: date("data_ordine").notNull(),
  dataConsegnaAttesa: date("data_consegna_attesa"),
  dataConsegnaEffettiva: date("data_consegna_effettiva"),
  stato: varchar("stato", { length: 20 }).notNull().default("in_attesa"), // in_attesa | in_transito | ricevuto | cancellato
  importoTotale: decimal("importo_totale", { precision: 10, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  nomeProdotto: text("nome_prodotto").notNull(), // snapshot at time of order
  quantita: integer("quantita").notNull(),
  costoUnitario: decimal("costo_unitario", { precision: 10, scale: 2 }).notNull(),
  quantitaRicevuta: integer("quantita_ricevuta").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
