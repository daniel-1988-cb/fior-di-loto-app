"use client";

import { useState, useEffect } from "react";
import {
 MessageCircle,
 ChevronDown,
 Copy,
 Check,
 ExternalLink,
 User,
 Edit3,
} from "lucide-react";
import { getClients } from "@/lib/actions/messages";
import { ReminderFlow } from "@/components/whatsapp/reminder-flow";

type Client = {
 id: string;
 nome: string;
 cognome: string;
 telefono: string | null;
 segmento: string;
};

const TEMPLATE_MESSAGGI = [
 {
  tipo: "promemoria_appuntamento",
  label: "Promemoria Appuntamento",
  emoji: "📅",
  testo: (nome: string) =>
   `Ciao ${nome}! 😊\nTi ricordiamo il tuo appuntamento da Fior di Loto.\nSe hai bisogno di modificarlo, scrivici pure!\nTi aspettiamo 🌸`,
 },
 {
  tipo: "conferma_appuntamento",
  label: "Conferma Appuntamento",
  emoji: "✅",
  testo: (nome: string) =>
   `Ciao ${nome}! ✅\nIl tuo appuntamento da Fior di Loto è confermato.\nNon vediamo l'ora di vederti! 🌸`,
 },
 {
  tipo: "follow_up",
  label: "Follow-up Trattamento",
  emoji: "💆",
  testo: (nome: string) =>
   `Ciao ${nome}! 😊\nCome ti senti dopo il trattamento?\nSiamo qui se hai domande o vuoi prenotare il prossimo appuntamento 🌸`,
 },
 {
  tipo: "offerta",
  label: "Offerta Speciale",
  emoji: "🎁",
  testo: (nome: string) =>
   `Ciao ${nome}! 🎁\nAbbiamo una proposta speciale per te!\nContattaci per scoprire l'offerta del momento da Fior di Loto 🌸`,
 },
 {
  tipo: "compleanno",
  label: "Auguri Compleanno",
  emoji: "🎂",
  testo: (nome: string) =>
   `Tanti auguri ${nome}! 🎂🎉\nIn occasione del tuo compleanno, ti aspettiamo da Fior di Loto con una sorpresa speciale 🌸\nBuon compleanno! 💖`,
 },
 {
  tipo: "ringraziamento",
  label: "Ringraziamento",
  emoji: "💖",
  testo: (nome: string) =>
   `Grazie ${nome}! 💖\nÈ sempre un piacere averti da Fior di Loto.\nTi aspettiamo presto! 🌸`,
 },
 {
  tipo: "riattivazione",
  label: "Riattivazione Cliente",
  emoji: "✨",
  testo: (nome: string) =>
   `Ciao ${nome}! ✨\nÈ un po' che non ci vediamo...\nAbbiamo tante novità per te da Fior di Loto! Quando vuoi fissare un appuntamento? 🌸`,
 },
 {
  tipo: "personalizzato",
  label: "Messaggio Libero",
  emoji: "✍️",
  testo: (_nome: string) => "",
 },
];

const SEGMENTO_STYLE: Record<string, string> = {
 lotina: "bg-gold/20 text-gold-dark",
 vip: "bg-rose/20 text-rose-dark",
 nuova: "bg-success/20 text-success",
 lead: "bg-info/20 text-info",
 inattiva: "bg-muted text-muted-foreground",
};
const SEGMENTO_LABEL: Record<string, string> = {
 lotina: "Lotina", vip: "VIP", nuova: "Nuova", lead: "Lead", inattiva: "Inattiva",
};

const inputClass =
 "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

export default function WhatsAppPage() {
 const [clients, setClients] = useState<Client[]>([]);
 const [selectedClientId, setSelectedClientId] = useState("");
 const [tipoSelezionato, setTipoSelezionato] = useState("promemoria_appuntamento");
 const [messaggio, setMessaggio] = useState("");
 const [copied, setCopied] = useState(false);
 const [searchCliente, setSearchCliente] = useState("");
 const [showDropdown, setShowDropdown] = useState(false);

 useEffect(() => {
  getClients().then((list) => setClients(list as Client[]));
 }, []);

 const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

 const filteredClients = searchCliente
  ? clients.filter((c) =>
    `${c.nome} ${c.cognome}`.toLowerCase().includes(searchCliente.toLowerCase()) ||
    (c.telefono || "").includes(searchCliente)
   )
  : clients;

 function handleSelectTemplate(tipo: string) {
  setTipoSelezionato(tipo);
  const template = TEMPLATE_MESSAGGI.find((t) => t.tipo === tipo);
  if (template && selectedClient) {
   setMessaggio(template.testo(selectedClient.nome));
  } else if (template) {
   setMessaggio(template.testo(""));
  }
 }

 function handleSelectClient(c: Client) {
  setSelectedClientId(c.id);
  setSearchCliente("");
  setShowDropdown(false);
  const template = TEMPLATE_MESSAGGI.find((t) => t.tipo === tipoSelezionato);
  if (template) setMessaggio(template.testo(c.nome));
 }

 function handleOpenWhatsApp() {
  if (!selectedClient?.telefono) return;
  const phone = selectedClient.telefono.replace(/\D/g, "");
  const url = `https://wa.me/39${phone}?text=${encodeURIComponent(messaggio)}`;
  window.open(url, "_blank");
 }

 async function handleCopy() {
  await navigator.clipboard.writeText(messaggio);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
 }

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <h1 className="text-3xl font-bold text-brown">
     WhatsApp
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Invia messaggi rapidi alle clienti direttamente su WhatsApp
    </p>
   </div>

   <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    {/* LEFT */}
    <div className="space-y-4">

     {/* Client selector */}
     <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-brown">
       <User className="h-4 w-4" />
       Seleziona Cliente
      </h2>
      <div className="relative">
       <input
        type="text"
        placeholder="Cerca per nome o telefono..."
        value={selectedClient ? `${selectedClient.nome} ${selectedClient.cognome}` : searchCliente}
        onChange={(e) => {
         if (selectedClient) setSelectedClientId("");
         setSearchCliente(e.target.value);
         setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className={inputClass}
       />
       <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />

       {showDropdown && filteredClients.length > 0 && !selectedClient && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
         {filteredClients.slice(0, 20).map((c) => (
          <button
           key={c.id}
           onClick={() => handleSelectClient(c)}
           className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-cream-dark"
          >
           <div>
            <span className="text-sm font-medium text-brown">
             {c.nome} {c.cognome}
            </span>
            {c.telefono && (
             <span className="ml-2 text-xs text-muted-foreground">{c.telefono}</span>
            )}
           </div>
           <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENTO_STYLE[c.segmento] || "bg-muted text-muted-foreground"}`}>
            {SEGMENTO_LABEL[c.segmento] || c.segmento}
           </span>
          </button>
         ))}
        </div>
       )}
      </div>

      {selectedClient && (
       <div className="mt-3 flex items-center justify-between rounded-lg bg-cream-dark/60 px-3 py-2">
        <div className="flex items-center gap-2">
         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose/10">
          <span className="text-xs font-bold text-rose">
           {selectedClient.nome[0]}{selectedClient.cognome[0]}
          </span>
         </div>
         <div>
          <p className="text-sm font-medium text-brown">
           {selectedClient.nome} {selectedClient.cognome}
          </p>
          <p className="text-xs text-muted-foreground">
           {selectedClient.telefono || "Nessun telefono"}
          </p>
         </div>
        </div>
        <button
         onClick={() => { setSelectedClientId(""); setMessaggio(""); }}
         className="text-xs text-muted-foreground hover:text-brown"
        >
         Cambia
        </button>
       </div>
      )}
     </div>

     {/* Template selector */}
     <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold text-brown">Template Messaggio</h2>
      <div className="grid grid-cols-2 gap-2">
       {TEMPLATE_MESSAGGI.map((t) => (
        <button
         key={t.tipo}
         onClick={() => handleSelectTemplate(t.tipo)}
         className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
          tipoSelezionato === t.tipo
           ? "border-rose bg-rose/5 text-rose"
           : "border-border bg-card text-brown hover:border-rose/40"
         }`}
        >
         <span className="mr-1">{t.emoji}</span>
         {t.label}
        </button>
       ))}
      </div>
     </div>
    </div>

    {/* RIGHT — Edit & Send */}
    <div className="space-y-4">
     <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
       <h2 className="flex items-center gap-2 font-semibold text-brown">
        <Edit3 className="h-4 w-4" />
        Messaggio
       </h2>
       {messaggio && (
        <button
         onClick={handleCopy}
         className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-cream-dark"
        >
         {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
         {copied ? "Copiato!" : "Copia"}
        </button>
       )}
      </div>

      {/* WhatsApp bubble preview */}
      {messaggio && (
       <div className="mb-4 rounded-xl bg-[#ECE5DD] p-4">
        <div className="max-w-xs rounded-xl rounded-tl-none bg-white px-4 py-3 ">
         <p className="whitespace-pre-wrap text-sm text-[#111]">{messaggio}</p>
         <p className="mt-1 text-right text-[10px] text-[#999]">
          {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} ✓✓
         </p>
        </div>
       </div>
      )}

      <textarea
       value={messaggio}
       onChange={(e) => setMessaggio(e.target.value)}
       placeholder="Scrivi o modifica il messaggio..."
       rows={6}
       className={`${inputClass} resize-none`}
      />
      <p className="mt-1 text-xs text-muted-foreground">
       Puoi modificare liberamente il testo prima di inviare
      </p>

      <div className="mt-4 flex gap-3">
       <button
        onClick={handleOpenWhatsApp}
        disabled={!selectedClient?.telefono || !messaggio}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20bc5a] disabled:cursor-not-allowed disabled:opacity-50"
       >
        <ExternalLink className="h-4 w-4" />
        Apri WhatsApp
       </button>
      </div>

      {selectedClient && !selectedClient.telefono && (
       <p className="mt-2 text-center text-xs text-red-500">
        Questa cliente non ha un numero di telefono registrato
       </p>
      )}
     </div>

     {/* Tip */}
     <div className="rounded-xl border border-border bg-cream-dark/40 p-4">
      <p className="mb-2 text-xs font-medium text-brown">Come funziona</p>
      <ul className="space-y-1 text-xs text-muted-foreground">
       <li>1️⃣ Seleziona la cliente</li>
       <li>2️⃣ Scegli un template o scrivi il messaggio</li>
       <li>3️⃣ Modifica il testo se necessario</li>
       <li>4️⃣ Clicca "Apri WhatsApp" per inviare</li>
      </ul>
     </div>
    </div>
   </div>

   {/* Promemoria guidati */}
   <div className="mt-8 rounded-lg border border-border bg-card p-5">
    <div className="mb-5 flex items-center gap-2">
     <MessageCircle className="h-5 w-5 text-rose" />
     <div>
      <h2 className="font-semibold text-brown">Promemoria Appuntamenti</h2>
      <p className="text-xs text-muted-foreground">
       Invia un promemoria a ogni cliente con appuntamento domani
      </p>
     </div>
    </div>
    <ReminderFlow />
   </div>
  </div>
 );
}
