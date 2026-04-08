export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
 ArrowLeft,
 Phone,
 Mail,
 MapPin,
 Calendar,
 Edit,
 MessageCircle,
 Tag,
 CheckCircle2,
 XCircle,
 AlertCircle,
 Clock,
} from "lucide-react";
import { getClient, getClientInteractions, getClientAppointments } from "@/lib/actions/clients";
import { formatPhone, formatDate, formatCurrency } from "@/lib/utils";
import { AddInteractionForm } from "@/components/clienti/add-interaction-form";

function getTipoColor(tipo: string) {
 switch (tipo) {
  case "trattamento": return "bg-rose/10 text-rose-dark";
  case "acquisto": return "bg-gold/10 text-gold-dark";
  case "messaggio": return "bg-info/10 text-info";
  case "nota": return "bg-muted text-muted-foreground";
  default: return "bg-muted text-muted-foreground";
 }
}

function getTipoLabel(tipo: string) {
 switch (tipo) {
  case "trattamento": return "Trattamento";
  case "acquisto": return "Acquisto";
  case "messaggio": return "Messaggio";
  case "nota": return "Nota";
  default: return tipo;
 }
}

function getSegmentoStyle(segmento: string) {
 switch (segmento) {
  case "lotina": return "bg-gold/20 text-gold-dark";
  case "vip": return "bg-rose/20 text-rose-dark";
  case "nuova": return "bg-success/20 text-success";
  case "lead": return "bg-info/20 text-info";
  case "inattiva": return "bg-muted text-muted-foreground";
  default: return "bg-muted text-muted-foreground";
 }
}

function getSegmentoLabel(segmento: string) {
 switch (segmento) {
  case "lotina": return "Lotina";
  case "vip": return "VIP";
  case "nuova": return "Nuova";
  case "lead": return "Lead";
  case "inattiva": return "Inattiva";
  default: return segmento;
 }
}

export default async function ClienteDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const client = await getClient(id);

 if (!client) {
  notFound();
 }

 const [interactions, appointments] = await Promise.all([
  getClientInteractions(id),
  getClientAppointments(id),
 ]);
 const tags: string[] = Array.isArray(client.tags) ? client.tags as string[] : (typeof client.tags === "string" ? (() => { try { return JSON.parse(client.tags as string) as string[]; } catch { return [] as string[]; } })() : []);

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <Link
     href="/clienti"
     className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     Torna ai clienti
    </Link>

    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose/10">
       <span className="text-2xl font-bold text-rose">
        {client.nome[0]}
        {client.cognome[0]}
       </span>
      </div>
      <div>
       <h1 className="text-3xl font-bold text-brown">
        {client.nome} {client.cognome}
       </h1>
       <span
        className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${getSegmentoStyle(client.segmento)}`}
       >
        {getSegmentoLabel(client.segmento)}
       </span>
      </div>
     </div>

     <div className="flex gap-2">
      {client.telefono && (
       <a
        href={`https://wa.me/39${client.telefono}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90"
       >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
       </a>
      )}
      <Link
       href={`/clienti/${client.id}/modifica`}
       className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
      >
       <Edit className="h-4 w-4" />
       Modifica
      </Link>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    {/* Left Column */}
    <div className="space-y-6">
     {/* Contact */}
     <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold text-brown">Contatti</h2>
      <div className="space-y-3">
       {client.telefono && (
        <div className="flex items-center gap-3 text-sm">
         <Phone className="h-4 w-4 text-muted-foreground" />
         <a href={`tel:+39${client.telefono}`} className="text-brown hover:text-rose">
          {formatPhone(client.telefono)}
         </a>
        </div>
       )}
       {client.email && (
        <div className="flex items-center gap-3 text-sm">
         <Mail className="h-4 w-4 text-muted-foreground" />
         <a href={`mailto:${client.email}`} className="text-brown hover:text-rose">
          {client.email}
         </a>
        </div>
       )}
       {client.indirizzo && (
        <div className="flex items-center gap-3 text-sm">
         <MapPin className="h-4 w-4 text-muted-foreground" />
         <span className="text-brown">{client.indirizzo}</span>
        </div>
       )}
       {client.data_nascita && (
        <div className="flex items-center gap-3 text-sm">
         <Calendar className="h-4 w-4 text-muted-foreground" />
         <span className="text-brown">{formatDate(client.data_nascita)}</span>
        </div>
       )}
      </div>
     </div>

     {/* Stats */}
     <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold text-brown">Riepilogo</h2>
      <div className="grid grid-cols-2 gap-4">
       <div>
        <p className="text-xs text-muted-foreground">Totale Speso</p>
        <p className="text-lg font-bold text-brown">
         {formatCurrency(Number(client.totale_speso))}
        </p>
       </div>
       <div>
        <p className="text-xs text-muted-foreground">Visite</p>
        <p className="text-lg font-bold text-brown">{client.totale_visite}</p>
       </div>
       <div>
        <p className="text-xs text-muted-foreground">Ultima Visita</p>
        <p className="text-sm font-medium text-brown">
         {client.ultima_visita ? formatDate(client.ultima_visita) : "Mai"}
        </p>
       </div>
       <div>
        <p className="text-xs text-muted-foreground">Fonte</p>
        <p className="text-sm font-medium text-brown capitalize">
         {client.fonte || "—"}
        </p>
       </div>
      </div>
     </div>

     {/* Tags */}
     {tags.length > 0 && (
      <div className="rounded-lg border border-border bg-card p-5">
       <h2 className="mb-3 flex items-center gap-2 font-semibold text-brown">
        <Tag className="h-4 w-4" />
        Tag
       </h2>
       <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
         <span key={tag} className="rounded-full bg-cream-dark px-3 py-1 text-xs font-medium text-brown/70">
          {tag}
         </span>
        ))}
       </div>
      </div>
     )}

     {/* Notes */}
     {client.note && (
      <div className="rounded-lg border border-border bg-card p-5">
       <h2 className="mb-3 font-semibold text-brown">Note</h2>
       <p className="text-sm leading-relaxed text-muted-foreground">{client.note}</p>
      </div>
     )}
    </div>

    {/* Right Column — History */}
    <div className="lg:col-span-2 space-y-6">
     {/* Appointment History */}
     {appointments.length > 0 && (
      <div className="rounded-lg border border-border bg-card p-5">
       <h2 className="mb-4 font-semibold text-brown">
        Storico Appuntamenti ({appointments.length})
       </h2>
       <div className="space-y-2">
        {(appointments as Record<string, unknown>[]).map((apt) => {
         const stato = apt.stato as string;
         const service = apt.services as { nome?: string; prezzo?: number } | null;
         const staff = apt.staff as { nome?: string; cognome?: string; colore?: string } | null;
         const dataStr = String(apt.data || "").slice(0, 10);
         const oraStr = String(apt.ora_inizio || "").slice(0, 5);
         const dataFormatted = dataStr ? new Date(dataStr + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—";

         const statoConfig: Record<string, { icon: import("react").ReactElement; label: string; color: string }> = {
          completato: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Completato", color: "text-success bg-success/10" },
          confermato: { icon: <Clock className="h-3.5 w-3.5" />, label: "Confermato", color: "text-info bg-info/10" },
          no_show: { icon: <XCircle className="h-3.5 w-3.5" />, label: "No-show", color: "text-destructive bg-destructive/10" },
          cancellato: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Cancellato", color: "text-muted-foreground bg-muted" },
         };
         const s = statoConfig[stato] || statoConfig.confermato;

         return (
          <div key={apt.id as string} className="flex items-center gap-3 rounded-lg border border-border/60 bg-cream-dark/30 px-3 py-2.5">
           <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
             <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${s.color}`}>
              {s.icon}
              {s.label}
             </span>
             <span className="text-sm font-medium text-brown truncate">
              {service?.nome || "—"}
             </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
             <span>{dataFormatted} {oraStr && `• ${oraStr}`}</span>
             {staff && (
              <span className="flex items-center gap-1">
               <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: staff.colore || "#e8a4a4" }} />
               {staff.nome}
              </span>
             )}
            </div>
           </div>
           {service?.prezzo != null && service.prezzo > 0 && stato === "completato" && (
            <span className="shrink-0 text-sm font-semibold text-brown">
             €{Number(service.prezzo).toFixed(0)}
            </span>
           )}
          </div>
         );
        })}
       </div>
      </div>
     )}

     <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold text-brown">
       Storico Interazioni ({interactions.length})
      </h2>
      {interactions.length === 0 ? (
       <p className="py-8 text-center text-sm text-muted-foreground">
        Nessuna interazione registrata
       </p>
      ) : (
       <div className="space-y-4">
        {interactions.map((item: Record<string, unknown>) => (
         <div
          key={item.id as string}
          className="flex items-start gap-3 border-b border-border/50 pb-4 last:border-0 last:pb-0"
         >
          <span
           className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${getTipoColor(item.tipo as string)}`}
          >
           {getTipoLabel(item.tipo as string)}
          </span>
          <div className="min-w-0 flex-1">
           <p className="text-sm text-brown">{item.descrizione as string}</p>
           <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(item.created_at as string)}
           </p>
          </div>
          {item.importo ? (
           <span className="shrink-0 text-sm font-semibold text-brown">
            {formatCurrency(Number(item.importo))}
           </span>
          ) : null}
         </div>
        ))}
       </div>
      )}
      <AddInteractionForm clientId={id} />
     </div>
    </div>
   </div>
  </div>
 );
}
