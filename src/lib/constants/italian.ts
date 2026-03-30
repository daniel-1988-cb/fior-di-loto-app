// Label e testi in italiano per tutta l'app

export const LABELS = {
  // Navigazione
  nav: {
    dashboard: "Dashboard",
    clienti: "Clienti",
    agenda: "Agenda",
    gestionale: "Gestionale",
    servizi: "Servizi",
    prodotti: "Prodotti",
    whatsapp: "WhatsApp",
    social: "Social Media",
    impostazioni: "Impostazioni",
  },

  // Dashboard
  dashboard: {
    titolo: "Dashboard",
    totaleClienti: "Totale Clienti",
    nuoviMese: "Nuovi questo mese",
    appuntamentiOggi: "Appuntamenti Oggi",
    entrateMese: "Entrate Mese",
    obiettivo: "Obiettivo",
  },

  // CRM Clienti
  clienti: {
    titolo: "Clienti",
    nuovoCliente: "Nuovo Cliente",
    cerca: "Cerca clienti...",
    nome: "Nome",
    cognome: "Cognome",
    telefono: "Telefono",
    email: "Email",
    dataNascita: "Data di Nascita",
    segmento: "Segmento",
    tag: "Tag",
    note: "Note",
    ultimaVisita: "Ultima Visita",
    totaleVisite: "Totale Visite",
    totaleSpeso: "Totale Speso",
    storico: "Storico",
    salva: "Salva",
    annulla: "Annulla",
    modifica: "Modifica",
    elimina: "Elimina",
    confermaElimina: "Sei sicura di voler eliminare questo cliente?",
  },

  // Segmenti
  segmenti: {
    lotina: "Lotina",
    nuova: "Nuova",
    lead: "Lead",
    inattiva: "Inattiva",
    vip: "VIP",
    tutti: "Tutti",
  },

  // Servizi
  categorie: {
    viso: "Viso",
    corpo: "Corpo",
    massaggi: "Massaggi",
    laser: "Laser",
    spa: "Spa Privata",
  },

  // Azioni comuni
  azioni: {
    salva: "Salva",
    annulla: "Annulla",
    modifica: "Modifica",
    elimina: "Elimina",
    cerca: "Cerca...",
    filtra: "Filtra",
    esporta: "Esporta",
    importa: "Importa",
    aggiungi: "Aggiungi",
    chiudi: "Chiudi",
    conferma: "Conferma",
    indietro: "Indietro",
  },

  // Messaggi
  messaggi: {
    salvato: "Salvato con successo",
    eliminato: "Eliminato con successo",
    errore: "Si e' verificato un errore",
    campiObbligatori: "Compila tutti i campi obbligatori",
    nessunoTrovato: "Nessun risultato trovato",
  },
} as const;
