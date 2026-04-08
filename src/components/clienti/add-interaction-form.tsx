"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addClientInteraction } from "@/lib/actions/clients";

const tipiOpzioni = [
 { value: "visita", label: "Visita" },
 { value: "trattamento", label: "Trattamento" },
 { value: "acquisto", label: "Acquisto" },
 { value: "messaggio", label: "Messaggio" },
 { value: "nota", label: "Nota" },
];

export function AddInteractionForm({ clientId }: { clientId: string }) {
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const [tipo, setTipo] = useState("visita");
 const [descrizione, setDescrizione] = useState("");
 const [importo, setImporto] = useState("");

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!descrizione.trim()) return;
  setLoading(true);
  try {
   await addClientInteraction(clientId, {
    tipo,
    descrizione,
    importo: importo ? parseFloat(importo) : undefined,
   });
   setDescrizione("");
   setImporto("");
   setOpen(false);
   router.refresh();
  } catch (err) {
   console.error(err);
   alert("Errore nel salvataggio");
  } finally {
   setLoading(false);
  }
 }

 const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

 return (
  <div className="mt-4 border-t border-border pt-4">
   {!open ? (
    <button
     onClick={() => setOpen(true)}
     className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-rose hover:text-rose"
    >
     <Plus className="h-4 w-4" />
     Aggiungi Interazione
    </button>
   ) : (
    <form onSubmit={handleSubmit} className="space-y-3">
     <div className="flex gap-2">
      <select
       value={tipo}
       onChange={(e) => setTipo(e.target.value)}
       className={inputClass}
       style={{ maxWidth: "140px" }}
      >
       {tipiOpzioni.map((t) => (
        <option key={t.value} value={t.value}>
         {t.label}
        </option>
       ))}
      </select>
      <input
       type="number"
       value={importo}
       onChange={(e) => setImporto(e.target.value)}
       placeholder="€ importo"
       min="0"
       step="0.01"
       className={inputClass}
       style={{ maxWidth: "120px" }}
      />
     </div>
     <textarea
      value={descrizione}
      onChange={(e) => setDescrizione(e.target.value)}
      required
      rows={2}
      placeholder="Descrivi l'interazione..."
      className={inputClass}
     />
     <div className="flex gap-2">
      <button
       type="submit"
       disabled={loading}
       className="rounded-lg bg-rose px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-dark disabled:opacity-50"
      >
       {loading ? "..." : "Salva"}
      </button>
      <button
       type="button"
       onClick={() => setOpen(false)}
       className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-brown hover:bg-cream-dark"
      >
       Annulla
      </button>
     </div>
    </form>
   )}
  </div>
 );
}
