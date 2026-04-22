"use client";

import { ArrowLeft, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useQuickActions } from "@/lib/quick-actions/storage";
import type { QuickActionId } from "@/lib/quick-actions/types";

export default function AzioniRapidePage() {
 const { actions, mounted, toggle, move, reset } = useQuickActions();

 return (
  <div className="mx-auto max-w-3xl">
   <div className="mb-4">
    <Link
     href="/impostazioni"
     className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="h-4 w-4" />
     Impostazioni
    </Link>
   </div>

   <header className="mb-6">
    <h1 className="text-2xl font-bold tracking-tight">Azioni rapide agenda</h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Personalizza le azioni che appaiono quando clicchi su uno slot vuoto
     in agenda o sul bottone <span className="font-medium">Aggiungi</span>.
     Le modifiche vengono salvate nel tuo browser.
    </p>
   </header>

   <ul
    className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
    aria-busy={!mounted}
   >
    {actions.map((a, idx) => {
     const isFirst = idx === 0;
     const isLast = idx === actions.length - 1;
     const Icon = a.icon;
     return (
      <li key={a.id} className="flex items-center gap-4 px-4 py-3">
       <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
       <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
         <span className="font-medium text-foreground">{a.label}</span>
         {!a.implemented && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
           Prossimamente
          </span>
         )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
         {a.description}
        </p>
       </div>

       <div className="flex items-center gap-1">
        <button
         type="button"
         onClick={() => move(a.id as QuickActionId, "up")}
         disabled={!mounted || isFirst}
         aria-label={`Sposta ${a.label} su`}
         className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
         <ChevronUp className="h-4 w-4" />
        </button>
        <button
         type="button"
         onClick={() => move(a.id as QuickActionId, "down")}
         disabled={!mounted || isLast}
         aria-label={`Sposta ${a.label} giù`}
         className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
         <ChevronDown className="h-4 w-4" />
        </button>
       </div>

       <button
        type="button"
        role="switch"
        aria-checked={a.enabled}
        aria-label={`Attiva o disattiva ${a.label}`}
        onClick={() => toggle(a.id as QuickActionId)}
        disabled={!mounted}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
         a.enabled ? "bg-rose" : "bg-muted"
        }`}
       >
        <span
         className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          a.enabled ? "translate-x-5" : "translate-x-0.5"
         }`}
        />
       </button>
      </li>
     );
    })}
   </ul>

   <div className="mt-6 flex items-center justify-between gap-4">
    <p className="text-xs text-muted-foreground">
     Le azioni disabilitate non appaiono nei menu. Puoi riattivarle quando vuoi.
    </p>
    <button
     type="button"
     onClick={reset}
     disabled={!mounted}
     className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
     <RotateCcw className="h-4 w-4" />
     Ripristina predefinite
    </button>
   </div>
  </div>
 );
}
