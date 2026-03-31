"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

const TIPI_MESSAGGIO = [
  "promemoria_appuntamento",
  "conferma_appuntamento",
  "follow_up_trattamento",
  "offerta_speciale",
  "auguri_compleanno",
  "ringraziamento",
  "riattivazione",
  "personalizzato",
] as const;

export type TipoMessaggio = (typeof TIPI_MESSAGGIO)[number];

export async function generaMessaggioAI(data: {
  clientId: string;
  tipo: TipoMessaggio;
  contestoExtra?: string;
}) {
  if (!isValidUUID(data.clientId)) throw new Error("ID cliente non valido");
  if (!TIPI_MESSAGGIO.includes(data.tipo)) throw new Error("Tipo messaggio non valido");

  const supabase = createAdminClient();

  // Load client profile
  const { data: client, error } = await supabase
    .from("clients")
    .select("nome, cognome, segmento, ultima_visita, totale_visite, totale_speso, data_nascita, note, tags, fonte")
    .eq("id", data.clientId)
    .single();

  if (error || !client) throw new Error("Cliente non trovato");

  // Load recent interactions (last 5)
  const { data: interactions } = await supabase
    .from("client_interactions")
    .select("tipo, descrizione, importo, created_at")
    .eq("client_id", data.clientId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Build context for AI
  const segmentoLabel: Record<string, string> = {
    lotina: "cliente fidelizzata (Lotina)",
    vip: "cliente VIP",
    nuova: "cliente nuova",
    lead: "potenziale cliente (Lead)",
    inattiva: "cliente inattiva",
  };

  const tipoLabel: Record<string, string> = {
    promemoria_appuntamento: "promemoria per appuntamento imminente",
    conferma_appuntamento: "conferma appuntamento prenotato",
    follow_up_trattamento: "follow-up dopo un trattamento",
    offerta_speciale: "offerta o promozione speciale",
    auguri_compleanno: "auguri di compleanno",
    ringraziamento: "ringraziamento per la visita/fedeltà",
    riattivazione: "riattivazione cliente inattiva",
    personalizzato: "messaggio personalizzato",
  };

  const ultimaVisita = client.ultima_visita
    ? new Date(client.ultima_visita).toLocaleDateString("it-IT")
    : "mai";

  const storicoTesto =
    interactions && interactions.length > 0
      ? interactions
          .map(
            (i) =>
              `- ${new Date(i.created_at as string).toLocaleDateString("it-IT")}: ${i.tipo} — ${i.descrizione}${i.importo ? ` (€${i.importo})` : ""}`
          )
          .join("\n")
      : "Nessuna interazione registrata";

  const prompt = `Sei l'assistente di Fior di Loto, un centro estetico premium a Campobasso.
Scrivi un messaggio WhatsApp per la cliente con queste caratteristiche:

**Cliente:** ${client.nome} ${client.cognome}
**Segmento:** ${segmentoLabel[client.segmento] || client.segmento}
**Ultima visita:** ${ultimaVisita}
**Totale visite:** ${client.totale_visite || 0}
**Totale speso:** €${Number(client.totale_speso || 0).toFixed(2)}
${client.note ? `**Note:** ${client.note}` : ""}

**Storico recente:**
${storicoTesto}

**Tipo di messaggio:** ${tipoLabel[data.tipo]}
${data.contestoExtra ? `**Contesto aggiuntivo:** ${data.contestoExtra}` : ""}

Istruzioni:
- Usa il nome "${client.nome}" nel messaggio
- Tono caldo, professionale, italiano
- Messaggio breve (max 150 parole)
- Includi emoji appropriate (non esagerare, max 2-3)
- Firma con "Laura - Fior di Loto 🌸"
- NON includere URL o link
- Scrivi SOLO il messaggio, niente altro`;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const testo =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  return { messaggio: testo, cliente: client };
}
