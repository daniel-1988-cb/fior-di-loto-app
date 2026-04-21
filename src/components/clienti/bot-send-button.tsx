"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { sendBotMessage } from "@/lib/actions/bot-send";

export function BotSendButton({ clientId }: { clientId: string }) {
 const [loading, setLoading] = useState(false);

 async function onClick() {
  const text = prompt("Messaggio da inviare via bot WhatsApp:");
  if (!text) return;
  setLoading(true);
  const res = await sendBotMessage(clientId, text);
  setLoading(false);
  if (res.ok) alert("Messaggio inviato!");
  else alert("Errore: " + (res.error ?? "unknown"));
 }

 return (
  <button
   onClick={onClick}
   disabled={loading}
   className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#20bc5a] disabled:opacity-50"
  >
   <Bot className="h-4 w-4" />
   {loading ? "Invio..." : "Invia (bot)"}
  </button>
 );
}
