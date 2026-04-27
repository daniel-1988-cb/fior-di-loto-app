"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ClientContext = {
  isExisting: boolean; // true se cliente già nel DB (non "Nuovo Contatto WA")
  profile?: string; // blocco testuale riassuntivo
  appointmentsUpcoming?: string; // lista testuale
  appointmentsPast?: string;
  vouchers?: string;
  programs?: string;
};

/**
 * Carica un blocco di contesto testuale su un cliente già censito nel gestionale.
 * Usato dal webhook WhatsApp per personalizzare la risposta del bot.
 *
 * Se il cliente corrisponde al placeholder creato al primo contatto WA
 * ("Nuovo Contatto WA"), ritorna `{ isExisting: false }` così il bot
 * tratta il messaggio come primo contatto.
 */
export async function getClientContextForBot(
  clientId: string,
): Promise<ClientContext> {
  const supabase = createAdminClient();

  // 1. Profilo — schema reale (niente `punti`/`tier` nella tabella clients)
  let { data: client } = await supabase
    .from("clients")
    .select(
      "id, nome, cognome, segmento, data_nascita, totale_visite, totale_speso, tags, note, ultima_visita, fonte, telefono",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { isExisting: false };

  // È un nuovo lead appena creato dal webhook? Il webhook usa questi
  // default. Prima di dichiarare `!isExisting`, fai un ultimo tentativo:
  // cerca un cliente reale con lo STESSO numero di telefono in varianti
  // (con/senza +39, con/senza spazi). Se lo trovi, usa quello invece
  // del placeholder — così chi era già cliente ma non aveva mai scritto
  // al bot viene riconosciuto e il contesto viene iniettato.
  const isPlaceholder =
    client.nome === "Nuovo" && client.cognome === "Contatto WA";
  if (isPlaceholder) {
    const phone = client.telefono ?? "";
    const digits = phone.replace(/\D/g, "");
    // Variants: +39XXX, 39XXX, XXX (senza prefisso), spaced
    const variants = Array.from(
      new Set(
        [
          phone,
          digits,
          digits.startsWith("39") ? digits.slice(2) : `39${digits}`,
          `+${digits}`,
          `+${digits.startsWith("39") ? digits : `39${digits}`}`,
        ].filter(Boolean),
      ),
    );
    if (variants.length > 0) {
      const { data: realMatches } = await supabase
        .from("clients")
        .select(
          "id, nome, cognome, segmento, data_nascita, totale_visite, totale_speso, tags, note, ultima_visita, fonte, telefono",
        )
        .in("telefono", variants)
        .neq("id", clientId)
        .not("nome", "eq", "Nuovo")
        .limit(1);
      if (realMatches && realMatches.length > 0) {
        client = realMatches[0];
      } else {
        return { isExisting: false };
      }
    } else {
      return { isExisting: false };
    }
  }

  const eta = client.data_nascita
    ? Math.floor(
        (Date.now() - new Date(client.data_nascita).getTime()) /
          (365.25 * 24 * 3600 * 1000),
      )
    : null;

  const ultimaVisitaStr = client.ultima_visita
    ? new Date(client.ultima_visita).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "mai";

  const tagsArr: string[] = Array.isArray(client.tags)
    ? (client.tags as unknown[]).filter(
        (t): t is string => typeof t === "string",
      )
    : [];

  const profileLines = [
    `Nome: ${client.nome} ${client.cognome}`,
    `Segmento: ${client.segmento ?? "-"}`,
    eta !== null ? `Età: ${eta} anni` : null,
    `Visite totali: ${client.totale_visite ?? 0}`,
    `Speso totale: €${Number(client.totale_speso ?? 0).toFixed(2)}`,
    `Ultima visita: ${ultimaVisitaStr}`,
    client.fonte ? `Fonte acquisizione: ${client.fonte}` : null,
    client.note ? `Note: ${client.note}` : null,
    tagsArr.length > 0 ? `Tag: ${tagsArr.join(", ")}` : null,
  ].filter((l): l is string => Boolean(l));

  const profile = profileLines.join("\n");

  // 2. Appuntamenti futuri (top 3, solo stati "vivi")
  // NB: usiamo `client.id` (il real match post-fallback) invece del
  // `clientId` originale — se abbiamo trovato un cliente reale dopo
  // il placeholder, gli appuntamenti sono sul suo id, non su quello
  // del placeholder appena creato.
  const realClientId = client.id as string;
  const today = new Date().toISOString().slice(0, 10);
  const { data: apptUpcoming } = await supabase
    .from("appointments")
    .select("data, ora_inizio, ora_fine, stato, services!inner(nome, categoria)")
    .eq("client_id", realClientId)
    .gte("data", today)
    .in("stato", ["confermato"])
    .order("data", { ascending: true })
    .limit(3);

  type ApptUpcomingRow = { data: string; ora_inizio: string; stato: string; services: { nome: string; categoria: string } | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- appointments join returns services as nested object; ApptUpcomingRow normalises the shape
  const appointmentsUpcoming = ((apptUpcoming ?? []) as unknown as ApptUpcomingRow[])
    .map((a) => {
      const s = a.services;
      const dataFmt = new Date(a.data).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const ora = a.ora_inizio?.slice(0, 5) ?? "";
      return `- ${dataFmt} alle ${ora} — ${s?.nome ?? "servizio"} (${a.stato})`;
    })
    .join("\n");

  // 3. Appuntamenti passati (ultimi 5 completati)
  const { data: apptPast } = await supabase
    .from("appointments")
    .select("data, ora_inizio, services!inner(nome)")
    .eq("client_id", realClientId)
    .eq("stato", "completato")
    .lt("data", today)
    .order("data", { ascending: false })
    .limit(5);

  type ApptPastRow = { data: string; ora_inizio: string; services: { nome: string } | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- appointments join returns services as nested object; ApptPastRow normalises the shape
  const appointmentsPast = ((apptPast ?? []) as unknown as ApptPastRow[])
    .map((a) => {
      const s = a.services;
      const dataFmt = new Date(a.data).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return `- ${dataFmt} — ${s?.nome ?? "servizio"}`;
    })
    .join("\n");

  // 4. Vouchers attivi — schema reale usa `usato: boolean` e `destinatario_id`
  //    per il beneficiario. Ci sono anche voucher senza destinatario (es.
  //    acquistati a se stessi), quindi consideriamo sia `destinatario_id`
  //    sia `acquistato_da_id`.
  let vouchers: string | undefined;
  try {
    const { data: v } = await supabase
      .from("vouchers")
      .select("codice, tipo, valore, data_scadenza, usato, destinatario_id, acquistato_da_id")
      .or(`destinatario_id.eq.${clientId},acquistato_da_id.eq.${clientId}`)
      .eq("usato", false);
    if (v && v.length > 0) {
      const rendered = v
        .map((x) => {
          const scad = x.data_scadenza
            ? `, scade ${new Date(
                x.data_scadenza as string,
              ).toLocaleDateString("it-IT")}`
            : "";
          const valoreStr =
            x.valore != null ? `€${Number(x.valore).toFixed(2)}` : "-";
          return `- ${x.tipo ?? "Voucher"} ${x.codice}: ${valoreStr}${scad}`;
        })
        .join("\n");
      vouchers = rendered || undefined;
    }
  } catch {
    // Schema diverso o errore di accesso: ignora silenziosamente.
  }

  // 5. Programmi trattamento in sospeso.
  //    NOTA: al momento non esiste una tabella `client_programs` che leghi
  //    cliente ↔ programma con sedute residue. Il try/catch sotto previene
  //    il crash se viene aggiunta in futuro ma lo schema differisce.
  let programs: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client_programs table not in current schema; entire block is future-proofed via try/catch
    const { data: p } = await (supabase as any)
      .from("client_programs")
      .select("program_id, sedute_totali, sedute_usate, treatment_programs(nome)")
      .eq("client_id", realClientId);
    if (p && p.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- p is any[] since table is not in schema
      const rendered = (p as any[])
        .map((x: any) => {
          const tp = (x as { treatment_programs: { nome: string } | null }).treatment_programs;
          const totali = Number(x.sedute_totali ?? 0);
          const usate = Number(x.sedute_usate ?? 0);
          const rimaste = totali - usate;
          return rimaste > 0
            ? `- ${tp?.nome ?? "Programma"}: ${rimaste} sedute residue su ${totali}`
            : null;
        })
        .filter((l): l is string => Boolean(l))
        .join("\n");
      programs = rendered || undefined;
    }
  } catch {
    // Tabella non presente nello schema attuale — ignora.
  }

  return {
    isExisting: true,
    profile: profile || undefined,
    appointmentsUpcoming: appointmentsUpcoming || undefined,
    appointmentsPast: appointmentsPast || undefined,
    vouchers,
    programs,
  };
}

/**
 * Trasforma il ClientContext in un blocco di testo da iniettare nel
 * systemInstruction di Gemini. Ritorna stringa vuota per nuovi lead.
 */
export async function buildClientContextPrompt(
  ctx: ClientContext,
): Promise<string> {
  if (!ctx.isExisting) return "";

  const sections: string[] = [];
  sections.push(
    "CONTESTO CLIENTE (già registrato nel gestionale — usa queste info per personalizzare la risposta, ma NON elencarle tutte né presentarle in modo freddo):",
  );
  if (ctx.profile) sections.push(`\n### Profilo\n${ctx.profile}`);
  if (ctx.appointmentsUpcoming)
    sections.push(`\n### Prossimi appuntamenti\n${ctx.appointmentsUpcoming}`);
  if (ctx.appointmentsPast)
    sections.push(`\n### Ultimi trattamenti\n${ctx.appointmentsPast}`);
  if (ctx.vouchers) sections.push(`\n### Buoni regalo attivi\n${ctx.vouchers}`);
  if (ctx.programs) sections.push(`\n### Programmi in corso\n${ctx.programs}`);

  sections.push("\n---\nLinee guida quando il contesto è disponibile:");
  sections.push("- Salutala per nome (solo il nome, mai 'Signora X')");
  sections.push(
    "- Se ha un appuntamento imminente, menzionalo naturalmente (es. 'ci vediamo giovedì per il Metodo Rinascita')",
  );
  sections.push(
    "- Usa il tono di chi la conosce già — NO domanda di qualificazione tipo 'quanti anni hai' se l'età è già qui",
  );
  sections.push(
    "- Se ha un voucher attivo o un programma in sospeso e il messaggio è pertinente, ricordaglielo",
  );
  sections.push("- Non presentarti come se fosse il primo contatto");

  return sections.join("\n");
}
