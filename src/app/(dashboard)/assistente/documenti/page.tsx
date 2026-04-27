"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, FileText, AlertCircle, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { getDocuments, createDocument, deleteDocument } from "@/lib/actions/ai-assistant";
import Link from "next/link";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

type Doc = {
 id: string;
 nome: string;
 descrizione: string | null;
 categoria: string;
 created_at: string;
 created_by_email: string | null;
};

const CATEGORIE = [
 { value: "protocollo", label: "Protocollo" },
 { value: "trattamento", label: "Trattamento" },
 { value: "prodotto", label: "Prodotto" },
 { value: "procedura", label: "Procedura" },
 { value: "policy", label: "Policy" },
 { value: "generale", label: "Generale" },
];

const CATEGORIA_STYLE: Record<string, string> = {
 protocollo: "bg-rose/10 text-rose-dark",
 trattamento: "bg-gold/10 text-gold-dark",
 prodotto: "bg-success/10 text-success",
 procedura: "bg-info/10 text-info",
 policy: "bg-muted text-muted-foreground",
 generale: "bg-muted text-muted-foreground",
};

const inputClass =
 "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

export default function DocumentiPage() {
 const [docs, setDocs] = useState<Doc[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState("");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const toast = useToast();
 const confirm = useConfirm();

 const [nome, setNome] = useState("");
 const [descrizione, setDescrizione] = useState("");
 const [contenuto, setContenuto] = useState("");
 const [categoria, setCategoria] = useState("protocollo");

 useEffect(() => {
  load();
 }, []);

 async function load() {
  setLoading(true);
  try {
   const list = await getDocuments();
   setDocs(list as Doc[]);
  } catch (e) {
   setError(e instanceof Error ? e.message : "Errore caricamento");
  } finally {
   setLoading(false);
  }
 }

 async function handleSave() {
  if (!nome.trim() || !contenuto.trim()) {
   setError("Nome e contenuto sono obbligatori");
   return;
  }
  setSaving(true);
  setError("");
  try {
   await createDocument({ nome, descrizione, contenuto, categoria });
   setNome(""); setDescrizione(""); setContenuto(""); setCategoria("protocollo");
   setShowForm(false);
   await load();
  } catch (e) {
   setError(e instanceof Error ? e.message : "Errore salvataggio");
  } finally {
   setSaving(false);
  }
 }

 async function handleDelete(id: string, docNome: string) {
  const ok = await confirm({
   title: `Eliminare "${docNome}"?`,
   confirmLabel: "Elimina",
   variant: "destructive",
  });
  if (!ok) return;
  try {
   await deleteDocument(id);
   setDocs((prev) => prev.filter((d) => d.id !== id));
  } catch (e) {
   toast.error(e instanceof Error ? e.message : "Errore eliminazione");
  }
 }

 function formatDate(s: string) {
  return new Date(s).toLocaleDateString("it-IT", {
   day: "2-digit", month: "short", year: "numeric",
   hour: "2-digit", minute: "2-digit",
  });
 }

 const groupedDocs = CATEGORIE.reduce((acc, cat) => {
  const items = docs.filter((d) => d.categoria === cat.value);
  if (items.length > 0) acc[cat.value] = items;
  return acc;
 }, {} as Record<string, Doc[]>);

 return (
  <div>
   <div className="mb-6">
    <Link
     href="/assistente"
     className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     Torna all&apos;Assistente
    </Link>
    <div className="flex items-center justify-between">
     <div>
      <h1 className="text-3xl font-bold text-brown">
       Documenti AI
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
       Protocolli e documenti usati dall&apos;assistente come base di conoscenza
      </p>
     </div>
     <div className="flex gap-2">
      <Link
       href="/assistente/logs"
       className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
      >
       Log Domande
      </Link>
      <button
       onClick={() => setShowForm((v) => !v)}
       className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
      >
       <Plus className="h-4 w-4" />
       Nuovo Documento
      </button>
     </div>
    </div>
   </div>

   {error && (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
     <AlertCircle className="h-4 w-4 shrink-0" />
     {error}
    </div>
   )}

   {showForm && (
    <div className="mb-6 rounded-xl border border-rose/30 bg-rose/5 p-5 ">
     <h2 className="mb-4 font-semibold text-brown">Nuovo Documento</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
       <input value={nome} onChange={(e) => setNome(e.target.value)}
        placeholder="Es: Protocollo Pulizia Viso Profonda"
        className={inputClass} />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Categoria *</label>
       <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
        {CATEGORIE.map((c) => (
         <option key={c.value} value={c.value}>{c.label}</option>
        ))}
       </select>
      </div>
      <div className="sm:col-span-2">
       <label className="mb-1 block text-sm font-medium text-brown">Descrizione breve</label>
       <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
        placeholder="Breve descrizione del documento"
        className={inputClass} />
      </div>
      <div className="sm:col-span-2">
       <label className="mb-1 block text-sm font-medium text-brown">
        Contenuto * <span className="font-normal text-muted-foreground">(incolla il testo del protocollo)</span>
       </label>
       <textarea
        value={contenuto}
        onChange={(e) => setContenuto(e.target.value)}
        placeholder="Incolla qui il testo completo del protocollo o documento..."
        rows={10}
        className={`${inputClass} resize-y`}
       />
       <p className="mt-1 text-xs text-muted-foreground">
        {contenuto.length.toLocaleString()} caratteri
       </p>
      </div>
     </div>
     <div className="mt-4 flex gap-3">
      <button
       onClick={handleSave}
       disabled={saving}
       className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
      >
       {saving ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
       ) : (
        <Plus className="h-4 w-4" />
       )}
       Salva Documento
      </button>
      <button onClick={() => setShowForm(false)}
       className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-cream-dark">
       Annulla
      </button>
     </div>
    </div>
   )}

   {loading ? (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
     <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose/30 border-t-rose" />
    </div>
   ) : docs.length === 0 ? (
    <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
     <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
     <p className="font-medium text-brown">Nessun documento caricato</p>
     <p className="mt-1 text-sm text-muted-foreground">
      Aggiungi protocolli e documenti per addestrare l&apos;assistente AI
     </p>
    </div>
   ) : (
    <div className="space-y-6">
     {Object.entries(groupedDocs).map(([cat, items]) => {
      const catLabel = CATEGORIE.find((c) => c.value === cat)?.label || cat;
      return (
       <div key={cat}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
         {catLabel} ({items.length})
        </h3>
        <div className="space-y-2">
         {items.map((doc) => (
          <div key={doc.id} className="rounded-lg border border-border bg-card">
           <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
             <p className="truncate font-medium text-brown">{doc.nome}</p>
             {doc.descrizione && (
              <p className="truncate text-xs text-muted-foreground">{doc.descrizione}</p>
             )}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_STYLE[doc.categoria] || "bg-muted text-muted-foreground"}`}>
             {catLabel}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
             {formatDate(doc.created_at)}
            </span>
            <button
             onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
             className="shrink-0 rounded p-1 text-muted-foreground hover:bg-cream-dark"
            >
             {expandedId === doc.id
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
             }
            </button>
            <button
             onClick={() => handleDelete(doc.id, doc.nome)}
             className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
            >
             <Trash2 className="h-4 w-4" />
            </button>
           </div>
           {expandedId === doc.id && (
            <div className="border-t border-border/50 px-4 py-3">
             <p className="text-xs text-muted-foreground mb-2">
              Aggiunto da {doc.created_by_email || "sconosciuto"} il {formatDate(doc.created_at)}
             </p>
            </div>
           )}
          </div>
         ))}
        </div>
       </div>
      );
     })}
    </div>
   )}
  </div>
 );
}
