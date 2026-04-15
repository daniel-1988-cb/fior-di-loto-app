"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { getVouchers } from "@/lib/actions/vouchers";

type Voucher = {
 id: string;
 codice: string;
 tipo: string;
 valore: number;
 usato: boolean;
 data_scadenza: string | null;
 descrizione: string | null;
 destinatario: { nome: string; cognome: string } | null;
 services: { nome: string } | null;
 products: { nome: string } | null;
 created_at: string;
};

function getStatoBadge(v: Voucher) {
 if (v.usato) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Usato</span>;
 }
 if (v.data_scadenza && new Date(v.data_scadenza) < new Date()) {
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Scaduto</span>;
 }
 return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Attivo</span>;
}

function getTipoLabel(v: Voucher) {
 if (v.tipo === "servizio") return v.services?.nome ? `Servizio: ${v.services.nome}` : "Servizio";
 if (v.tipo === "prodotto") return v.products?.nome ? `Prodotto: ${v.products.nome}` : "Prodotto";
 return `€${Number(v.valore).toFixed(2)}`;
}

type FilterStato = "tutti" | "attivi" | "usati";

export default function VoucherPage() {
 const [vouchers, setVouchers] = useState<Voucher[]>([]);
 const [loading, setLoading] = useState(true);
 const [filtro, setFiltro] = useState<FilterStato>("tutti");

 useEffect(() => {
  async function load() {
   try {
    const data = await getVouchers();
    setVouchers(data as unknown as Voucher[]);
   } catch (err) {
    console.error(err);
   } finally {
    setLoading(false);
   }
  }
  load();
 }, []);

 const filtered = vouchers.filter((v) => {
  if (filtro === "attivi") return !v.usato && (!v.data_scadenza || new Date(v.data_scadenza) >= new Date());
  if (filtro === "usati") return v.usato;
  return true;
 });

 return (
  <div>
   <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <h1 className="font-display text-3xl font-bold text-brown">
      Voucher
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">Gestisci buoni regalo e voucher sconto</p>
    </div>
    <Link
     href="/gestionale/voucher/nuovo"
     className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
    >
     <Plus className="h-4 w-4" />
     Nuovo Voucher
    </Link>
   </div>

   {/* Filtri */}
   <div className="mb-5 flex gap-2">
    {(["tutti", "attivi", "usati"] as FilterStato[]).map((f) => (
     <button
      key={f}
      onClick={() => setFiltro(f)}
      className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
       filtro === f
        ? "border-rose bg-rose text-white"
        : "border-border bg-card text-brown hover:bg-cream-dark"
      }`}
     >
      {f}
     </button>
    ))}
   </div>

   {/* Lista */}
   <div className="rounded-lg border border-border bg-card">
    {loading ? (
     <p className="py-12 text-center text-sm text-muted-foreground">Caricamento...</p>
    ) : filtered.length === 0 ? (
     <div className="py-12 text-center">
      <Tag className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Nessun voucher trovato</p>
      <Link
       href="/gestionale/voucher/nuovo"
       className="mt-3 inline-block text-sm text-rose hover:underline"
      >
       Crea il primo voucher
      </Link>
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-cream-dark/50">
         <th className="px-5 py-3 text-left font-medium text-muted-foreground">Codice</th>
         <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo / Valore</th>
         <th className="px-5 py-3 text-left font-medium text-muted-foreground">Destinatario</th>
         <th className="px-5 py-3 text-left font-medium text-muted-foreground">Scadenza</th>
         <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stato</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {filtered.map((v) => (
         <tr key={v.id} className="hover:bg-cream-dark/30">
          <td className="px-5 py-3">
           <span className="font-mono font-semibold text-brown">{v.codice}</span>
          </td>
          <td className="px-5 py-3 text-brown">
           {getTipoLabel(v)}
          </td>
          <td className="px-5 py-3 text-muted-foreground">
           {v.destinatario
            ? `${v.destinatario.nome} ${v.destinatario.cognome}`
            : "—"}
          </td>
          <td className="px-5 py-3 text-muted-foreground">
           {v.data_scadenza
            ? new Date(v.data_scadenza + "T00:00:00").toLocaleDateString("it-IT")
            : "—"}
          </td>
          <td className="px-5 py-3">
           {getStatoBadge(v)}
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}
   </div>
  </div>
 );
}
