"use server";

import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeString, truncate, isValidUUID } from "@/lib/security/validate";

const VALID_CATEGORIE = ["generale", "protocollo", "trattamento", "prodotto", "procedura", "policy"] as const;
type Categoria = (typeof VALID_CATEGORIE)[number];
const VALID_VISIBILITA = ["tutti", "operatrice", "admin"] as const;
type Visibilita = (typeof VALID_VISIBILITA)[number];

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "laura@fiordiloto.it,daniel@fiordiloto.it")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(user.email.toLowerCase());
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments() {
  const supabase = createAdminClient();
  const admin = await isAdmin();
  let query = supabase
    .from("ai_documents")
    .select("id, nome, descrizione, categoria, visibilita, created_at, created_by_email")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });
  if (!admin) {
    query = query.in("visibilita", ["tutti", "operatrice"]);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createDocument(data: {
  nome: string;
  descrizione?: string;
  contenuto: string;
  categoria: string;
  visibilita?: string;
}) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  if (!data.nome?.trim()) throw new Error("Nome obbligatorio");
  if (!data.contenuto?.trim()) throw new Error("Contenuto obbligatorio");
  if (!VALID_CATEGORIE.includes(data.categoria as Categoria)) throw new Error("Categoria non valida");
  const vis = data.visibilita && VALID_VISIBILITA.includes(data.visibilita as Visibilita)
    ? data.visibilita
    : "tutti";

  const user = await getCurrentUser();
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("ai_documents")
    .insert({
      nome: truncate(sanitizeString(data.nome), 200),
      descrizione: data.descrizione ? truncate(sanitizeString(data.descrizione), 500) : null,
      contenuto: truncate(data.contenuto.trim(), 50000),
      categoria: data.categoria,
      visibilita: vis,
      created_by_email: user?.email || "unknown",
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteDocument(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  const { error } = await supabase.from("ai_documents").delete().eq("id", id);
  if (error) throw error;
}

// ─── AI Query ────────────────────────────────────────────────────────────────

export async function askAssistant(domanda: string) {
  if (!domanda?.trim()) throw new Error("Domanda obbligatoria");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurata. Aggiungila in .env.local e nelle variabili Vercel.");
  }

  const user = await getCurrentUser();
  const cleanQuestion = truncate(sanitizeString(domanda), 1000);

  const supabase = createAdminClient();

  // Load documents visible to the current user as context
  const admin = await isAdmin();
  let docsQuery = supabase
    .from("ai_documents")
    .select("nome, categoria, contenuto, visibilita")
    .order("categoria");
  if (!admin) {
    docsQuery = docsQuery.in("visibilita", ["tutti", "operatrice"]);
  }
  const docsResult = await docsQuery;
  const docs = docsResult.data;

  const hasDocs = docs && docs.length > 0;

  const contextSection = hasDocs
    ? docs
        .map(
          (d) =>
            `## ${d.nome} [${d.categoria}]\n${d.contenuto}`
        )
        .join("\n\n---\n\n")
    : "Nessun documento caricato ancora.";

  const systemPrompt = `Sei l'assistente AI interno di Fior di Loto, un centro estetico premium a Campobasso.
Il tuo compito è supportare lo staff (estetiste, receptionist) rispondendo a domande sui protocolli di trattamento, procedure operative, prodotti e policy interne.

DOCUMENTI INTERNI DISPONIBILI:
${contextSection}

ISTRUZIONI:
- Rispondi SEMPRE in italiano
- Sii precisa e concisa
- Se la risposta è nei documenti, citala con precisione
- Se non hai informazioni sufficienti, dillo chiaramente
- Non inventare protocolli o dosaggi — la sicurezza è prioritaria
- Usa un tono professionale ma accessibile`;

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: cleanQuestion }] }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1500,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const risposta = (response.text ?? "").trim();

  // Log the query (graceful if table doesn't exist yet)
  await supabase.from("ai_query_logs").insert({
    user_id: user?.id || null,
    user_email: user?.email || "anonimo",
    domanda: cleanQuestion,
    risposta,
  }).then(() => {}, () => {});

  return { risposta, hasDocs };
}

// ─── Logs (admin only) ────────────────────────────────────────────────────────

export async function getQueryLogs(filters?: { userEmail?: string; limit?: number }) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  const supabase = createAdminClient();
  let query = supabase
    .from("ai_query_logs")
    .select("id, user_email, domanda, risposta, created_at")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 200);

  if (filters?.userEmail) {
    query = query.eq("user_email", filters.userEmail);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLogUsers() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_query_logs")
    .select("user_email")
    .order("user_email");

  if (error) throw error;

  const unique = [...new Set((data || []).map((r) => r.user_email as string))];
  return unique;
}
