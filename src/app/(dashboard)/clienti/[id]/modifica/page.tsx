"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { LABELS } from "@/lib/constants/italian";
import { getClient, updateClient } from "@/lib/actions/clients";

const segmentiOpzioni = [
 { value: "nuova", label: LABELS.segmenti.nuova },
 { value: "lead", label: LABELS.segmenti.lead },
 { value: "lotina", label: LABELS.segmenti.lotina },
 { value: "vip", label: LABELS.segmenti.vip },
 { value: "inattiva", label: LABELS.segmenti.inattiva },
];

const fontiOpzioni = [
 { value: "instagram", label: "Instagram" },
 { value: "whatsapp", label: "WhatsApp" },
 { value: "passaparola", label: "Passaparola" },
 { value: "meta_ads", label: "Meta Ads" },
 { value: "walk_in", label: "Passaggio diretto" },
 { value: "altro", label: "Altro" },
];

export default function ModificaClientePage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = use(params);
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [notFound, setNotFound] = useState(false);
 const [formData, setFormData] = useState({
  nome: "",
  cognome: "",
  telefono: "",
  email: "",
  dataNascita: "",
  indirizzo: "",
  segmento: "nuova",
  fonte: "",
  note: "",
  tags: "",
 });

 useEffect(() => {
  async function loadClient() {
   const client = await getClient(id);
   if (!client) {
    setNotFound(true);
    return;
   }
   const tags = Array.isArray(client.tags) ? (client.tags as string[]).join(", ") : "";
   setFormData({
    nome: client.nome || "",
    cognome: client.cognome || "",
    telefono: client.telefono || "",
    email: client.email || "",
    dataNascita: client.data_nascita ? String(client.data_nascita).slice(0, 10) : "",
    indirizzo: client.indirizzo || "",
    segmento: client.segmento || "nuova",
    fonte: client.fonte || "",
    note: client.note || "",
    tags,
   });
  }
  loadClient();
 }, [id]);

 function handleChange(
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
 ) {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
 }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  try {
   const tags = formData.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

   await updateClient(id, {
    nome: formData.nome,
    cognome: formData.cognome,
    telefono: formData.telefono || undefined,
    email: formData.email || undefined,
    dataNascita: formData.dataNascita || undefined,
    indirizzo: formData.indirizzo || undefined,
    segmento: formData.segmento,
    fonte: formData.fonte || undefined,
    note: formData.note || undefined,
    tags,
   });

   router.push(`/clienti/${id}`);
   router.refresh();
  } catch (err) {
   console.error("Errore salvataggio:", err);
   alert("Errore durante il salvataggio. Riprova.");
  } finally {
   setLoading(false);
  }
 }

 const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

 if (notFound) {
  return (
   <div className="py-16 text-center">
    <p className="text-lg font-medium text-brown">Cliente non trovato</p>
    <Link href="/clienti" className="mt-4 inline-block text-sm text-rose hover:underline">
     Torna ai clienti
    </Link>
   </div>
  );
 }

 return (
  <div>
   <div className="mb-6">
    <Link
     href={`/clienti/${id}`}
     className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     {LABELS.azioni.indietro}
    </Link>
    <h1 className="text-3xl font-bold text-brown">
     Modifica Cliente
    </h1>
   </div>

   <form onSubmit={handleSubmit} className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Dati Personali</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.nome} *
       </label>
       <input
        type="text"
        name="nome"
        value={formData.nome}
        onChange={handleChange}
        required
        className={inputClass}
       />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.cognome} *
       </label>
       <input
        type="text"
        name="cognome"
        value={formData.cognome}
        onChange={handleChange}
        required
        className={inputClass}
       />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.telefono}
       </label>
       <input
        type="tel"
        name="telefono"
        value={formData.telefono}
        onChange={handleChange}
        placeholder="333 123 4567"
        className={inputClass}
       />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.email}
       </label>
       <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="email@esempio.it"
        className={inputClass}
       />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.dataNascita}
       </label>
       <input
        type="date"
        name="dataNascita"
        value={formData.dataNascita}
        onChange={handleChange}
        className={inputClass}
       />
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">Indirizzo</label>
       <input
        type="text"
        name="indirizzo"
        value={formData.indirizzo}
        onChange={handleChange}
        placeholder="Via Roma 1, Campobasso"
        className={inputClass}
       />
      </div>
     </div>
    </div>

    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Classificazione</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        {LABELS.clienti.segmento}
       </label>
       <select
        name="segmento"
        value={formData.segmento}
        onChange={handleChange}
        className={inputClass}
       >
        {segmentiOpzioni.map((opt) => (
         <option key={opt.value} value={opt.value}>
          {opt.label}
         </option>
        ))}
       </select>
      </div>
      <div>
       <label className="mb-1 block text-sm font-medium text-brown">
        Come ci ha conosciuto
       </label>
       <select
        name="fonte"
        value={formData.fonte}
        onChange={handleChange}
        className={inputClass}
       >
        <option value="">Seleziona...</option>
        {fontiOpzioni.map((opt) => (
         <option key={opt.value} value={opt.value}>
          {opt.label}
         </option>
        ))}
       </select>
      </div>
      <div className="sm:col-span-2">
       <label className="mb-1 block text-sm font-medium text-brown">
        Tag (separati da virgola)
       </label>
       <input
        type="text"
        name="tags"
        value={formData.tags}
        onChange={handleChange}
        placeholder="Metodo Rinascita, Viso, Corpo..."
        className={inputClass}
       />
      </div>
     </div>
    </div>

    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Note</h2>
     <textarea
      name="note"
      value={formData.note}
      onChange={handleChange}
      rows={4}
      placeholder="Note sul cliente, preferenze, allergie..."
      className={inputClass}
     />
    </div>

    <div className="flex gap-3">
     <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-rose px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
     >
      <Save className="h-4 w-4" />
      {loading ? "Salvataggio..." : LABELS.azioni.salva}
     </button>
     <Link
      href={`/clienti/${id}`}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
     >
      {LABELS.azioni.annulla}
     </Link>
    </div>
   </form>
  </div>
 );
}
