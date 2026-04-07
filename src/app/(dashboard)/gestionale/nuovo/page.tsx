"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createTransaction } from "@/lib/actions/transactions";

const categorie = {
  entrata: ["servizio", "prodotto", "abbonamento", "altro"],
  uscita: ["affitto", "forniture", "marketing", "stipendio", "utenze", "attrezzatura", "altro"],
};

export default function NuovaTransazionePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "entrata",
    categoria: "",
    descrizione: "",
    importo: "",
    metodoPagamento: "",
    data: new Date().toISOString().slice(0, 10),
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset categoria when tipo changes
      ...(name === "tipo" ? { categoria: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const importoNum = parseFloat(formData.importo);
    if (isNaN(importoNum) || importoNum <= 0) {
      alert("Inserisci un importo valido");
      return;
    }
    setLoading(true);

    try {
      await createTransaction({
        tipo: formData.tipo,
        categoria: formData.categoria,
        descrizione: formData.descrizione,
        importo: importoNum,
        metodoPagamento: formData.metodoPagamento || undefined,
        data: formData.data,
      });
      router.push("/gestionale");
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

  const currentCategorie = formData.tipo === "entrata" ? categorie.entrata : categorie.uscita;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/gestionale"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Nuova Transazione
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Dettagli Transazione</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tipo */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Tipo *</label>
              <div className="flex gap-3">
                {["entrata", "uscita"].map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="tipo"
                      value={t}
                      checked={formData.tipo === t}
                      onChange={handleChange}
                      className="accent-rose"
                    />
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${t === "entrata" ? "bg-success/20 text-success" : "bg-red-100 text-red-600"}`}>
                      {t === "entrata" ? "Entrata" : "Uscita"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Data *</label>
              <input type="date" name="data" value={formData.data} onChange={handleChange} required className={inputClass} />
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Categoria *</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} required className={inputClass}>
                <option value="">Seleziona...</option>
                {currentCategorie.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Metodo pagamento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Metodo Pagamento</label>
              <select name="metodoPagamento" value={formData.metodoPagamento} onChange={handleChange} className={inputClass}>
                <option value="">Seleziona...</option>
                <option value="contanti">Contanti</option>
                <option value="carta">Carta</option>
                <option value="bonifico">Bonifico</option>
                <option value="satispay">Satispay</option>
              </select>
            </div>

            {/* Descrizione */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-brown">Descrizione *</label>
              <input
                type="text"
                name="descrizione"
                value={formData.descrizione}
                onChange={handleChange}
                required
                placeholder="Es. Trattamento viso Sig.ra Rossi..."
                className={inputClass}
              />
            </div>

            {/* Importo */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Importo (€) *</label>
              <input
                type="number"
                name="importo"
                value={formData.importo}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
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
            {loading ? "Salvataggio..." : "Salva Transazione"}
          </button>
          <Link
            href="/gestionale"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
