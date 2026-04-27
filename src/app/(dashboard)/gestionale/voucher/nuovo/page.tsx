"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { createVoucher } from "@/lib/actions/vouchers";
import { getClients } from "@/lib/actions/clients";
import { getServices } from "@/lib/actions/services";
import { getProducts } from "@/lib/actions/products";
import { useToast } from "@/lib/hooks/use-toast";

type ClientOption = { id: string; nome: string; cognome: string };
type ServiceOption = { id: string; nome: string; prezzo: number };
type ProductOption = { id: string; nome: string; prezzo: number };

const inputClass =
 "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

function NuovoVoucherForm() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [clients, setClients] = useState<ClientOption[]>([]);
 const [services, setServices] = useState<ServiceOption[]>([]);
 const [products, setProducts] = useState<ProductOption[]>([]);
 const [generatedCode, setGeneratedCode] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 const toast = useToast();

 const [tipo, setTipo] = useState<"importo" | "servizio" | "prodotto">("importo");
 const [valore, setValore] = useState("");
 const [serviceId, setServiceId] = useState("");
 const [productId, setProductId] = useState("");
 const [destinatarioId, setDestinatarioId] = useState("");
 const [acquistatoDaId, setAcquistatoDaId] = useState("");
 const [descrizione, setDescrizione] = useState("");
 const [dataScadenza, setDataScadenza] = useState("");

 useEffect(() => {
  async function load() {
   try {
    const [cls, svcs, prods] = await Promise.all([
     getClients(),
     getServices(),
     getProducts(),
    ]);
    setClients(cls as unknown as ClientOption[]);
    setServices(svcs as unknown as ServiceOption[]);
    setProducts(prods as unknown as ProductOption[]);
   } catch (err) {
    console.error(err);
   }
  }
  load();
 }, []);

 useEffect(() => {
  if (tipo === "servizio" && serviceId) {
   const svc = services.find((s) => s.id === serviceId);
   if (svc) setValore(String(svc.prezzo));
  }
 }, [tipo, serviceId, services]);

 useEffect(() => {
  if (tipo === "prodotto" && productId) {
   const prod = products.find((p) => p.id === productId);
   if (prod) setValore(String(prod.prezzo));
  }
 }, [tipo, productId, products]);

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const valoreParsed = parseFloat(valore);
  if (!valore || isNaN(valoreParsed) || valoreParsed <= 0) {
   toast.error("Inserisci un valore valido");
   return;
  }
  if (tipo === "servizio" && !serviceId) {
   toast.error("Seleziona un servizio");
   return;
  }
  if (tipo === "prodotto" && !productId) {
   toast.error("Seleziona un prodotto");
   return;
  }

  setLoading(true);
  try {
   const result = await createVoucher({
    tipo,
    valore: valoreParsed,
    serviceId: tipo === "servizio" ? serviceId : undefined,
    productId: tipo === "prodotto" ? productId : undefined,
    destinatarioId: destinatarioId || undefined,
    acquistatoDaId: acquistatoDaId || undefined,
    descrizione: descrizione || undefined,
    dataScadenza: dataScadenza || undefined,
   });
   setGeneratedCode((result as { codice: string }).codice);
  } catch (err) {
   console.error(err);
   toast.error("Errore durante la creazione del voucher. Riprova.");
  } finally {
   setLoading(false);
  }
 }

 async function handleCopy() {
  if (!generatedCode) return;
  try {
   await navigator.clipboard.writeText(generatedCode);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
  } catch {
   // fallback
  }
 }

 if (generatedCode) {
  return (
   <div>
    <div className="mb-6">
     <h1 className="text-3xl font-bold text-brown">
      Voucher Creato!
     </h1>
    </div>
    <div className="rounded-xl border border-border bg-card p-8 text-center">
     <p className="mb-2 text-sm text-muted-foreground">Codice voucher generato:</p>
     <div className="mx-auto mb-6 max-w-xs rounded-xl border-2 border-rose bg-rose/5 px-8 py-6">
      <p className="font-mono text-4xl font-bold tracking-widest text-rose">
       {generatedCode}
      </p>
     </div>
     <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <button
       type="button"
       onClick={handleCopy}
       className="inline-flex items-center gap-2 rounded-lg border border-rose px-5 py-2.5 text-sm font-medium text-rose hover:bg-rose/5"
      >
       {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
       {copied ? "Copiato!" : "Copia codice"}
      </button>
      <Link
       href="/gestionale/voucher"
       className="inline-flex items-center gap-2 rounded-lg bg-rose px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
      >
       Torna ai Voucher
      </Link>
      <button
       type="button"
       onClick={() => {
        setGeneratedCode(null);
        setValore("");
        setServiceId("");
        setProductId("");
        setDestinatarioId("");
        setAcquistatoDaId("");
        setDescrizione("");
        setDataScadenza("");
        setTipo("importo");
       }}
       className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
      >
       Crea Altro
      </button>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div>
   <div className="mb-6">
    <Link
     href="/gestionale/voucher"
     className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     Indietro
    </Link>
    <h1 className="text-3xl font-bold text-brown">
     Nuovo Voucher
    </h1>
   </div>

   <form onSubmit={handleSubmit} className="space-y-6">
    <div className="rounded-lg border border-border bg-card p-5">
     <h2 className="mb-4 font-semibold text-brown">Tipo Voucher</h2>
     <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(
       [
        { value: "importo", label: "Importo Libero" },
        { value: "servizio", label: "Servizio Specifico" },
        { value: "prodotto", label: "Prodotto Specifico" },
       ] as const
      ).map((opt) => (
       <button
        key={opt.value}
        type="button"
        onClick={() => setTipo(opt.value)}
        className={`rounded-lg border py-3 text-sm font-medium transition-colors ${
         tipo === opt.value
          ? "border-rose bg-rose text-white"
          : "border-border bg-card text-brown hover:bg-cream-dark"
        }`}
       >
        {opt.label}
       </button>
      ))}
     </div>

     <div className="mt-4">
      {tipo === "importo" && (
       <div>
        <label className="mb-1 block text-sm font-medium text-brown">Importo (€) *</label>
        <input
         type="number"
         min="0.01"
         step="0.01"
         value={valore}
         onChange={(e) => setValore(e.target.value)}
         placeholder="Es. 50.00"
         required
         className={inputClass}
        />
       </div>
      )}
      {tipo === "servizio" && (
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
         <label className="mb-1 block text-sm font-medium text-brown">Servizio *</label>
         <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className={inputClass}>
          <option value="">Seleziona servizio...</option>
          {services.map((s) => (
           <option key={s.id} value={s.id}>{s.nome} — €{Number(s.prezzo).toFixed(2)}</option>
          ))}
         </select>
        </div>
        <div>
         <label className="mb-1 block text-sm font-medium text-brown">Valore (€) *</label>
         <input type="number" min="0.01" step="0.01" value={valore} onChange={(e) => setValore(e.target.value)} required className={inputClass} />
        </div>
       </div>
      )}
      {tipo === "prodotto" && (
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
         <label className="mb-1 block text-sm font-medium text-brown">Prodotto *</label>
         <select value={productId} onChange={(e) => setProductId(e.target.value)} required className={inputClass}>
          <option value="">Seleziona prodotto...</option>
          {products.map((p) => (
           <option key={p.id} value={p.id}>{p.nome} — €{Number(p.prezzo).toFixed(2)}</option>
          ))}
         </select>
        </div>
        <div>
         <label className="mb-1 block text-sm font-medium text-brown">Valore (€) *</label>
         <input type="number" min="0.01" step="0.01" value={valore} onChange={(e) => setValore(e.target.value)} required className={inputClass} />
        </div>
       </div>
      )}
     </div>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
     <h2 className="mb-4 font-semibold text-brown">Persone (opzionale)</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Destinatario</label>
       <select value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)} className={inputClass}>
        <option value="">Nessun destinatario</option>
        {clients.map((c) => (
         <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
        ))}
       </select>
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Acquistato da</label>
       <select value={acquistatoDaId} onChange={(e) => setAcquistatoDaId(e.target.value)} className={inputClass}>
        <option value="">Nessuno</option>
        {clients.map((c) => (
         <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
        ))}
       </select>
      </div>
     </div>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
     <h2 className="mb-4 font-semibold text-brown">Dettagli</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Data Scadenza</label>
       <input type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className={inputClass} />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Descrizione / Note</label>
       <input type="text" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Note opzionali..." className={inputClass} />
      </div>
     </div>
    </div>

    <div className="flex gap-3">
     <button type="submit" disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-rose px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50">
      {loading ? "Generazione..." : "Genera Voucher"}
     </button>
     <Link href="/gestionale/voucher"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark">
      Annulla
     </Link>
    </div>
   </form>
  </div>
 );
}

export default function NuovoVoucherPage() {
 return (
  <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento...</div>}>
   <NuovoVoucherForm />
  </Suspense>
 );
}
