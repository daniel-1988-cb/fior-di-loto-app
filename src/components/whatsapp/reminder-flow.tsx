"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, ChevronRight, Phone, Clock, Scissors, RefreshCw } from "lucide-react";
import { getAppuntamentiDomani, type AppuntamentoDomani } from "@/lib/actions/reminders";

function buildMessaggio(a: AppuntamentoDomani): string {
 return `Ciao ${a.cliente_nome}! 😊\nTi ricordiamo il tuo appuntamento di domani da Fior di Loto:\n\n🕐 Ore ${a.ora}\n💆 ${a.servizio_nome}${a.operatrice ? `\n👩 Con ${a.operatrice}` : ""}\n\nTi aspettiamo! 🌸\nPer modifiche o disdette, rispondi pure a questo messaggio.`;
}

export function ReminderFlow() {
 const [appuntamenti, setAppuntamenti] = useState<AppuntamentoDomani[] | null>(null);
 const [loading, setLoading] = useState(false);
 const [step, setStep] = useState(0); // indice corrente
 const [inviati, setInviati] = useState<Set<string>>(new Set());

 async function carica() {
  setLoading(true);
  const list = await getAppuntamentiDomani();
  setAppuntamenti(list);
  setStep(0);
  setInviati(new Set());
  setLoading(false);
 }

 function apriWhatsApp(a: AppuntamentoDomani) {
  if (!a.cliente_telefono) return;
  const phone = a.cliente_telefono.replace(/\D/g, "");
  const testo = buildMessaggio(a);
  const url = `https://wa.me/39${phone}?text=${encodeURIComponent(testo)}`;
  window.open(url, "_blank");
 }

 function segnaInviato(id: string) {
  setInviati((prev) => new Set([...prev, id]));
  if (appuntamenti && step < appuntamenti.length - 1) {
   setStep((s) => s + 1);
  }
 }

 const corrente = appuntamenti?.[step] ?? null;
 const totale = appuntamenti?.length ?? 0;
 const completati = inviati.size;

 // Stato iniziale
 if (appuntamenti === null) {
  return (
   <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose/10">
     <Phone className="h-6 w-6 text-rose" />
    </div>
    <p className="mb-1 font-medium text-brown">Promemoria Appuntamenti Domani</p>
    <p className="mb-5 text-xs text-muted-foreground">
     Carica la lista degli appuntamenti di domani e invia un promemoria a ogni cliente
    </p>
    <button
     onClick={carica}
     disabled={loading}
     className="inline-flex items-center gap-2 rounded-xl bg-brown px-5 py-2.5 text-sm font-semibold text-white hover:bg-brown/90 disabled:opacity-60"
    >
     {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
     ) : (
      <RefreshCw className="h-4 w-4" />
     )}
     Carica Appuntamenti di Domani
    </button>
   </div>
  );
 }

 // Nessun appuntamento
 if (totale === 0) {
  return (
   <div className="flex flex-col items-center justify-center py-10 text-center">
    <p className="mb-1 text-2xl">🎉</p>
    <p className="font-medium text-brown">Nessun appuntamento domani</p>
    <p className="mt-1 text-xs text-muted-foreground">Non ci sono clienti da avvisare</p>
    <button onClick={carica} className="mt-4 text-xs text-rose hover:underline">
     Ricarica
    </button>
   </div>
  );
 }

 // Tutti completati
 if (completati === totale) {
  return (
   <div className="flex flex-col items-center justify-center py-10 text-center">
    <CheckCircle2 className="mb-3 h-12 w-12 text-success" />
    <p className="font-medium text-brown">Tutti i promemoria inviati!</p>
    <p className="mt-1 text-xs text-muted-foreground">
     {totale} clienti avvisati per gli appuntamenti di domani
    </p>
    <button
     onClick={carica}
     className="mt-4 inline-flex items-center gap-1 text-xs text-rose hover:underline"
    >
     <RefreshCw className="h-3 w-3" /> Ricarica
    </button>
   </div>
  );
 }

 return (
  <div>
   {/* Progress bar */}
   <div className="mb-5">
    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
     <span>{completati} inviati su {totale}</span>
     <span>{Math.round((completati / totale) * 100)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-cream-dark">
     <div
      className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all duration-500"
      style={{ width: `${(completati / totale) * 100}%` }}
     />
    </div>
   </div>

   {/* Lista appuntamenti (mini) */}
   <div className="mb-5 flex gap-1.5 flex-wrap">
    {appuntamenti.map((a, i) => (
     <button
      key={a.id}
      onClick={() => setStep(i)}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
       inviati.has(a.id)
        ? "bg-success/20 text-success"
        : i === step
        ? "bg-rose text-white"
        : "bg-cream-dark text-muted-foreground hover:bg-rose/10"
      }`}
     >
      {inviati.has(a.id) ? "✓ " : ""}{a.cliente_nome}
     </button>
    ))}
   </div>

   {/* Card cliente corrente */}
   {corrente && (
    <div className={`rounded-xl border-2 p-5 transition-all ${
     inviati.has(corrente.id) ? "border-success/30 bg-success/5" : "border-rose/30 bg-rose/5"
    }`}>
     <div className="mb-4 flex items-start justify-between">
      <div>
       <p className="text-lg font-bold text-brown">
        {corrente.cliente_nome} {corrente.cliente_cognome}
       </p>
       <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
         <Clock className="h-3 w-3" /> {corrente.ora}
        </span>
        <span className="flex items-center gap-1">
         <Scissors className="h-3 w-3" /> {corrente.servizio_nome}
        </span>
        {corrente.operatrice && (
         <span>👩 {corrente.operatrice}</span>
        )}
       </div>
      </div>
      <span className="rounded-lg bg-card px-2 py-1 text-xs font-medium text-brown ">
       {step + 1} / {totale}
      </span>
     </div>

     {/* Anteprima messaggio */}
     <div className="mb-4 rounded-lg bg-[#ECE5DD] p-3">
      <div className="max-w-xs rounded-xl rounded-tl-none bg-card px-3 py-2.5 ">
       <p className="whitespace-pre-wrap text-xs text-[#111]">
        {buildMessaggio(corrente)}
       </p>
      </div>
     </div>

     {corrente.cliente_telefono ? (
      <div className="flex gap-3">
       <button
        onClick={() => apriWhatsApp(corrente)}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20bc5a]"
       >
        <ExternalLink className="h-4 w-4" />
        Apri WhatsApp
       </button>
       <button
        onClick={() => segnaInviato(corrente.id)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-success bg-card px-4 py-2.5 text-sm font-medium text-success hover:bg-success/5"
       >
        <CheckCircle2 className="h-4 w-4" />
        Fatto
        {step < totale - 1 && <ChevronRight className="h-3.5 w-3.5" />}
       </button>
      </div>
     ) : (
      <div className="rounded-lg bg-red-50 p-3 text-xs text-red-500">
       Nessun numero di telefono registrato per questa cliente
       <button
        onClick={() => segnaInviato(corrente.id)}
        className="ml-3 font-medium underline"
       >
        Salta →
       </button>
      </div>
     )}
    </div>
   )}
  </div>
 );
}
