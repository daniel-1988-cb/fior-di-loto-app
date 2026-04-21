import { getBotConversation } from "@/lib/actions/bot-conversations";
import { ThreadControls } from "@/components/whatsapp/thread-controls";
import { notFound } from "next/navigation";

export default async function ConversationDetailPage({
 params,
}: {
 params: Promise<{ clientId: string }>;
}) {
 const { clientId } = await params;
 const { client, messages, thread } = await getBotConversation(clientId);
 if (!client) notFound();

 const threadStatus = thread?.status ?? "active";
 const isHuman = threadStatus === "human_takeover";

 return (
  <div className="mx-auto max-w-3xl">
   <div className="mb-4 rounded-lg border border-border bg-card p-4">
    <div className="flex items-center gap-2">
     <p className="font-semibold text-brown">
      {client.nome} {client.cognome}
     </p>
     {isHuman && (
      <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-medium text-rose">
       Gestito da operatore
      </span>
     )}
    </div>
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

   <ThreadControls clientId={clientId} initialStatus={threadStatus} />
  </div>
 );
}
