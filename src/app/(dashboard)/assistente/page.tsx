"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import { askAssistant } from "@/lib/actions/ai-assistant";
import Link from "next/link";

type Message = {
 role: "user" | "assistant";
 content: string;
 timestamp: Date;
};

export default function AssistentePage() {
 const [messages, setMessages] = useState<Message[]>([
  {
   role: "assistant",
   content:
    "Ciao! Sono l'assistente AI di Fior di Loto 🌸\n\nPuoi chiedermi tutto sui protocolli di trattamento, procedure operative, prodotti e policy interne. Come posso aiutarti?",
   timestamp: new Date(),
  },
 ]);
 const [input, setInput] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [noDocsWarning, setNoDocsWarning] = useState(false);
 const bottomRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [messages]);

 async function handleSend() {
  const domanda = input.trim();
  if (!domanda || loading) return;

  setInput("");
  setError("");
  setMessages((prev) => [
   ...prev,
   { role: "user", content: domanda, timestamp: new Date() },
  ]);
  setLoading(true);

  try {
   const { risposta, hasDocs } = await askAssistant(domanda);
   if (!hasDocs) setNoDocsWarning(true);
   setMessages((prev) => [
    ...prev,
    { role: "assistant", content: risposta, timestamp: new Date() },
   ]);
  } catch (e) {
   const msg = e instanceof Error ? e.message : String(e);
   if (msg.includes("GEMINI_API_KEY") || msg.includes("API key") || msg.includes("non configurata")) {
    setError("⚠️ Chiave API Gemini non configurata. Aggiungila in .env.local (GEMINI_API_KEY) e nelle variabili Vercel.");
   } else if (msg.includes("ai_query_logs") || msg.includes("ai_documents") || msg.includes("does not exist")) {
    setError("⚠️ Tabelle DB mancanti. Esegui la migrazione SQL in Supabase (supabase/migrations/003_ai_assistant.sql).");
   } else if (msg.includes("Server Component") || msg.includes("digest")) {
    setError("⚠️ Chiave API Gemini non configurata. Aggiungila in .env.local e nelle variabili Vercel.");
   } else {
    setError(msg);
   }
  } finally {
   setLoading(false);
   inputRef.current?.focus();
  }
 }

 function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
   e.preventDefault();
   handleSend();
  }
 }

 function formatTime(d: Date) {
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
 }

 return (
  <div className="flex h-[calc(100vh-120px)] flex-col">
   {/* Header */}
   <div className="mb-4 flex items-center justify-between">
    <div>
     <h1 className="font-display text-3xl font-bold text-brown">
      Assistente AI
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">
      Chiedi tutto sui protocolli, trattamenti e procedure interne
     </p>
    </div>
    <Link
     href="/assistente/documenti"
     className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
    >
     <BookOpen className="h-4 w-4" />
     Gestisci Documenti
    </Link>
   </div>

   {/* No docs warning */}
   {noDocsWarning && (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-dark">
     <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
     <span>
      Nessun documento caricato — le risposte sono generali.{" "}
      <Link href="/assistente/documenti" className="underline">
       Carica i tuoi protocolli
      </Link>{" "}
      per risposte specifiche a Fior di Loto.
     </span>
    </div>
   )}

   {/* Chat area */}
   <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
    <div className="space-y-4">
     {messages.map((msg, i) => (
      <div
       key={i}
       className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
      >
       {/* Avatar */}
       <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
         msg.role === "assistant" ? "bg-rose/10" : "bg-brown/10"
        }`}
       >
        {msg.role === "assistant" ? (
         <Bot className="h-4 w-4 text-rose" />
        ) : (
         <User className="h-4 w-4 text-brown" />
        )}
       </div>

       {/* Bubble */}
       <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
         className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          msg.role === "assistant"
           ? "rounded-tl-none bg-cream-dark/60 text-brown"
           : "rounded-tr-none bg-brown text-cream"
         }`}
        >
         {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground">
         {formatTime(msg.timestamp)}
        </span>
       </div>
      </div>
     ))}

     {/* Loading bubble */}
     {loading && (
      <div className="flex gap-3">
       <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose/10">
        <Bot className="h-4 w-4 text-rose" />
       </div>
       <div className="rounded-xl rounded-tl-none bg-cream-dark/60 px-4 py-3">
        <div className="flex gap-1">
         <span className="h-2 w-2 animate-bounce rounded-full bg-rose/60 [animation-delay:0ms]" />
         <span className="h-2 w-2 animate-bounce rounded-full bg-rose/60 [animation-delay:150ms]" />
         <span className="h-2 w-2 animate-bounce rounded-full bg-rose/60 [animation-delay:300ms]" />
        </div>
       </div>
      </div>
     )}

     <div ref={bottomRef} />
    </div>
   </div>

   {/* Error */}
   {error && (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
     {error}
    </div>
   )}

   {/* Input */}
   <div className="mt-3 flex items-end gap-2">
    <div className="relative flex-1">
     <textarea
      ref={inputRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Fai una domanda su protocolli, trattamenti, prodotti..."
      rows={2}
      className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
     />
     <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
      ↵ invia
     </span>
    </div>
    <button
     onClick={handleSend}
     disabled={loading || !input.trim()}
     className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brown text-white hover:bg-brown/90 disabled:opacity-50"
    >
     {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
     ) : (
      <Send className="h-4 w-4" />
     )}
    </button>
   </div>

   {/* Suggested questions */}
   {messages.length === 1 && (
    <div className="mt-3">
     <p className="mb-2 text-xs text-muted-foreground">Domande frequenti:</p>
     <div className="flex flex-wrap gap-2">
      {[
       "Come si esegue la pulizia viso profonda?",
       "Quali prodotti Rinascita usiamo per il viso?",
       "Protocollo post laser?",
       "Come gestire una reazione allergica?",
      ].map((q) => (
       <button
        key={q}
        onClick={() => setInput(q)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-rose/40 hover:text-brown"
       >
        <Sparkles className="h-3 w-3" />
        {q}
       </button>
      ))}
     </div>
    </div>
   )}
  </div>
 );
}
