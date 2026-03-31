"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { getService, updateService } from "@/lib/actions/services";
import { LABELS } from "@/lib/constants/italian";

const categorieOpzioni = [
  { value: "viso", label: LABELS.categorie.viso },
  { value: "corpo", label: LABELS.categorie.corpo },
  { value: "massaggi", label: LABELS.categorie.massaggi },
  { value: "laser", label: LABELS.categorie.laser },
  { value: "spa", label: LABELS.categorie.spa },
];

export default function ModificaServizioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "viso",
    descrizione: "",
    durata: "",
    prezzo: "",
  });

  useEffect(() => {
    async function fetchService() {
      try {
        const data = await getService(id);
        if (data) {
          setFormData({
            nome: data.nome || "",
            categoria: data.categoria || "viso",
            descrizione: data.descrizione || "",
            durata: String(data.durata || ""),
            prezzo: String(data.prezzo || ""),
          });
        }
      } catch (err) {
        console.error("Errore caricamento servizio:", err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchService();
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durata = parseInt(formData.durata, 10);
    const prezzo = parseFloat(formData.prezzo);

    if (!Number.isInteger(durata) || durata <= 0) {
      alert("Inserisci una durata valida in minuti");
      return;
    }
    if (isNaN(prezzo) || prezzo <= 0) {
      alert("Inserisci un prezzo valido");
      return;
    }

    setLoading(true);
    try {
      await updateService(id, {
        nome: formData.nome,
        categoria: formData.categoria,
        descrizione: formData.descrizione || undefined,
        durata,
        prezzo,
      });
      router.push("/servizi");
      router.refresh();
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/servizi"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Modifica Servizio
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Dettagli Servizio</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="Es. Trattamento Viso Idratante"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Categoria *</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} required className={inputClass}>
                {categorieOpzioni.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Durata (minuti) *</label>
              <input
                type="number"
                name="durata"
                value={formData.durata}
                onChange={handleChange}
                required
                min="1"
                step="5"
                placeholder="60"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Prezzo (€) *</label>
              <input
                type="number"
                name="prezzo"
                value={formData.prezzo}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-brown">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleChange}
                rows={3}
                placeholder="Descrizione del trattamento..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-rose px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Salvataggio..." : "Salva Modifiche"}
          </button>
          <Link
            href="/servizi"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
