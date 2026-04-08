"use client";

import { useState, useEffect } from "react";
import { getQueryLogs, getLogUsers } from "@/lib/actions/ai-assistant";
import { ArrowLeft, Search, User, Clock, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Log = {
 id: string;
 user_email: string;
 domanda: string;
 risposta: string | null;
 created_at: string;
};

function formatDateTime(s: string) {
 const d = new Date(s);
 return d.toLocaleDateString("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  day: "2-digit",
  month: "long",
  year: "numeric",
 });
}

function getUserColor(email: string) {
 const colors = [
  "bg-rose/10 text-rose-dark",
  "bg-gold/10 text-gold-dark",
  "bg-success/10 text-success",
  "bg-info/10 text-info",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
 ];
 let hash = 0;
 for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
 return colors[Math.abs(hash) % colors.length];
}

function getUserInitial(email: string) {
 return (email[0] || "?").toUpperCase();
}

export default function LogsPage() {
 const [logs, setLogs] = useState<Log[]>([]);
 const [users, setUsers] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [filterUser, setFilterUser] = useState("");
 const [search, setSearch] = useState("");
 const [expandedId, setExpandedId] = useState<string | null>(null);

 useEffect(() => {
  loadAll();
 }, []);

 useEffect(() => {
  loadLogs();
 }, [filterUser]);

 async function loadAll() {
  setLoading(true);
  try {
   const [logList, userList] = await Promise.all([
    getQueryLogs(),
    getLogUsers(),
   ]);
   setLogs(logList as Log[]);
   setUsers(userList);
  } catch (e) {
   setError(e instanceof Error ? e.message : "Errore");
  } finally {
   setLoading(false);
  }
 }

 async function loadLogs() {
  try {
   const logList = await getQueryLogs({ userEmail: filterUser || undefined });
   setLogs(logList as Log[]);
  } catch (e) {
   setError(e instanceof Error ? e.message : "Errore");
  }
 }

 const filteredLogs = search
  ? logs.filter(
    (l) =>
     l.domanda.toLowerCase().includes(search.toLowerCase()) ||
     l.user_email.toLowerCase().includes(search.toLowerCase())
   )
  : logs;

 // Group by user for summary
 const userStats = users.map((email) => ({
  email,
  count: logs.filter((l) => l.user_email === email).length,
 })).sort((a, b) => b.count - a.count);

 return (
  <div>
   {/* Header */}
   <div className="mb-6">
    <Link
     href="/assistente/documenti"
     className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     Torna ai Documenti
    </Link>
    <h1 className="text-3xl font-bold text-brown">
     Log Domande AI
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Tutte le domande fatte all&apos;assistente — visibile solo agli amministratori
    </p>
   </div>

   {error && (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
     {error === "Accesso negato"
      ? "Accesso riservato agli amministratori"
      : error}
    </div>
   )}

   {/* User summary cards */}
   {userStats.length > 0 && (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
     <div
      className={`cursor-pointer rounded-xl border p-3 text-center transition-colors ${
       !filterUser ? "border-rose bg-rose/5" : "border-border bg-card hover:border-rose/40"
      }`}
      onClick={() => setFilterUser("")}
     >
      <p className="text-lg font-bold text-brown">{logs.length}</p>
      <p className="text-xs text-muted-foreground">Tutti</p>
     </div>
     {userStats.map(({ email, count }) => (
      <div
       key={email}
       className={`cursor-pointer rounded-xl border p-3 transition-colors ${
        filterUser === email ? "border-rose bg-rose/5" : "border-border bg-card hover:border-rose/40"
       }`}
       onClick={() => setFilterUser(filterUser === email ? "" : email)}
      >
       <div className="mb-1 flex items-center justify-center">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${getUserColor(email)}`}>
         {getUserInitial(email)}
        </div>
       </div>
       <p className="text-lg font-bold text-brown">{count}</p>
       <p className="truncate text-xs text-muted-foreground">{email.split("@")[0]}</p>
      </div>
     ))}
    </div>
   )}

   {/* Search */}
   <div className="mb-4 relative">
    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <input
     type="text"
     value={search}
     onChange={(e) => setSearch(e.target.value)}
     placeholder="Cerca per domanda o utente..."
     className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
    />
   </div>

   {/* Logs list */}
   {loading ? (
    <div className="flex justify-center py-20">
     <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose/30 border-t-rose" />
    </div>
   ) : filteredLogs.length === 0 ? (
    <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
     <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
     <p className="text-sm text-muted-foreground">Nessun log trovato</p>
    </div>
   ) : (
    <div className="space-y-2">
     {filteredLogs.map((log) => (
      <div key={log.id} className="rounded-lg border border-border bg-card overflow-hidden">
       {/* Log row */}
       <div className="flex items-start gap-3 px-4 py-3">
        {/* User avatar */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getUserColor(log.user_email)}`}>
         {getUserInitial(log.user_email)}
        </div>

        <div className="flex-1 min-w-0">
         {/* User + time */}
         <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-medium text-brown">{log.user_email}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
           <Clock className="h-3 w-3" />
           {formatDateTime(log.created_at)}
          </span>
         </div>
         {/* Question */}
         <p className="text-sm text-brown line-clamp-2">{log.domanda}</p>
        </div>

        <button
         onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
         className="shrink-0 rounded p-1 text-muted-foreground hover:bg-cream-dark"
        >
         {expandedId === log.id
          ? <ChevronUp className="h-4 w-4" />
          : <ChevronDown className="h-4 w-4" />
         }
        </button>
       </div>

       {/* Expanded — full Q&A */}
       {expandedId === log.id && (
        <div className="border-t border-border/50 bg-cream-dark/30 px-4 py-3 space-y-3">
         <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-brown">
           <User className="h-3 w-3" /> Domanda completa
          </p>
          <p className="text-sm text-brown whitespace-pre-wrap">{log.domanda}</p>
         </div>
         {log.risposta && (
          <div>
           <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> Risposta AI
           </p>
           <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.risposta}</p>
          </div>
         )}
        </div>
       )}
      </div>
     ))}
    </div>
   )}

   {filteredLogs.length > 0 && (
    <p className="mt-3 text-center text-xs text-muted-foreground">
     {filteredLogs.length} log{filterUser ? ` per ${filterUser}` : " totali"}
    </p>
   )}
  </div>
 );
}
