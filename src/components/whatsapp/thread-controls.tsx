"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User } from "lucide-react";
import { setThreadMode, sendManualReply } from "@/lib/actions/bot-conversations";
import { useToast } from "@/lib/hooks/use-toast";

type Props = {
 clientId: string;
 initialStatus: string;
};

export function ThreadControls({ clientId, initialStatus }: Props) {
 const router = useRouter();
 const [status, setStatus] = useState(initialStatus);
 const [text, setText] = useState("");
 const [pending, startTransition] = useTransition();
 const isHuman = status === "human_takeover";
 const toast = useToast();

 function toggleMode() {
  const next = isHuman ? "active" : "human_takeover";
  startTransition(async () => {
   const res = await setThreadMode(clientId, next);
   if (res.ok) {
    setStatus(next);
    router.refresh();
   } else {
    toast.error("Errore: " + res.error);
   }
  });
 }

 function onSend() {
  if (!text.trim()) return;
  startTransition(async () => {
   const res = await sendManualReply(clientId, text);
   if (res.ok) {
    setText("");
    router.refresh();
   } else {
    toast.error("Errore invio: " + res.error);
   }
  });
 }

 return (
  <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
   <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
     {isHuman ? (
      <User className="h-4 w-4 text-rose" />
     ) : (
      <Bot className="h-4 w-4 text-muted-foreground" />
     )}
     <span className="text-sm font-medium text-brown">
      {isHuman ? "Gestito da operatore" : "Bot automatico attivo"}
     </span>
    </div>
    <button
     onClick={toggleMode}
     disabled={pending}
     className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-cream-dark disabled:opacity-50"
    >
     {isHuman ? "Riattiva bot" : "Prendi il controllo"}
    </button>
   </div>

   {isHuman && (
    <div className="space-y-2">
     <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Rispondi come operatore..."
      rows={3}
      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
     />
     <button
      onClick={onSend}
      disabled={pending || !text.trim()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bc5a] disabled:cursor-not-allowed disabled:opacity-50"
     >
      <Send className="h-4 w-4" />
      {pending ? "Invio..." : "Invia messaggio"}
     </button>
    </div>
   )}
  </div>
 );
}
