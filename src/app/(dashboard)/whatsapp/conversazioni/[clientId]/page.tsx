import { getBotConversation } from "@/lib/actions/bot-conversations";
import { notFound } from "next/navigation";

export default async function ConversationDetailPage({
 params,
}: {
 params: Promise<{ clientId: string }>;
}) {
 const { clientId } = await params;
 const { client, messages } = await getBotConversation(clientId);
 if (!client) notFound();

 return (
  <div className="mx-auto max-w-3xl">
   <div className="mb-4 rounded-lg border border-border bg-card p-4">
    <p className="font-semibold text-brown">
     {client.nome} {client.cognome}
    </p>
    <p className="text-xs text-muted-foreground">{client.telefono}</p>
   </div>

   <div className="rounded-lg border border-border bg-[#ECE5DD] p-4">
    <div className="space-y-3">
     {messages.map((m) => (
      <div
       key={m.id}
       className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
      >
       <div
        className={`max-w-xs rounded-xl px-4 py-2 text-sm ${
         m.role === "user" ? "rounded-tl-none bg-white" : "rounded-tr-none bg-[#DCF8C6]"
        }`}
       >
        <p className="whitespace-pre-wrap text-[#111]">{m.content}</p>
        <p className="mt-1 text-right text-[10px] text-[#999]">
         {new Date(m.created_at).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
         })}
        </p>
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
}
