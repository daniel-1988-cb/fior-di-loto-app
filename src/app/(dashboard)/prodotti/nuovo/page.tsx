"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createProduct } from "@/lib/actions/products";

export default function NuovoProdottoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    descrizione: "",
    prezzo: "",
    giacenza: "",
    sogliaAlert: "5",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prezzo = parseFloat(formData.prezzo);
    const giacenza = parseInt(formData.giacenza, 10);
    const sogliaAlert = parseInt(formData.sogliaAlert, 10);

    if (isNaN(prezzo) || prezzo < 0) { alert("Inserisci un prezzo valido"); return; }
    if (!Number.isInteger(giacenza) || giacenza < 0) { alert("Inserisci una giacenza valida"); return; }

    setLoading(true);
    try {
      await createProduct({
        nome: formData.nome,
        categoria: formData.categoria,
        descrizione: formData.descrizione || undefined,
        prezzo,
        giacenza,
        sogliaAlert: isNaN(sogliaAlert) ? 5 : sogliaAlert,
      });
      router.push("/prodotti");
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/prodotti"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Nuovo Prodotto
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Dettagli Prodotto</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="Es. Crema Idratante SPF 30"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Categoria *</label>
              <input
                type="text"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
                placeholder="Es. Skincare, Make-up, Corpo..."
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
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Giacenza *</label>
              <input
                type="number"
                name="giacenza"
                value={formData.giacenza}
                onChange={handleChange}
                required
                min="0"
                step="1"
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Soglia Alert</label>
              <input
                type="number"
                name="sogliaAlert"
                value={formData.sogliaAlert}
                onChange={handleChange}
                min="0"
                step="1"
                placeholder="5"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">Avviso quando la giacenza scende sotto questa soglia</p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-brown">Descrizione</label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleChange}
                rows={3}
                placeholder="Descrizione del prodotto..."
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
            {loading ? "Salvataggio..." : "Salva Prodotto"}
          </button>
          <Link
            href="/prodotti"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
