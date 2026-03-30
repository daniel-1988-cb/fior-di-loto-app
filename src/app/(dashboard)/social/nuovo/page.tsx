"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createSocialPost } from "@/lib/actions/social";

const piattaformeOpzioni = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
];

const tipiOpzioni = [
  { value: "reel_hook", label: "Reel Hook" },
  { value: "educational", label: "Educational" },
  { value: "prima_dopo", label: "Prima / Dopo" },
  { value: "connessione", label: "Connessione" },
  { value: "prodotto", label: "Prodotto" },
];

const statiOpzioni = [
  { value: "bozza", label: "Bozza" },
  { value: "programmato", label: "Programmato" },
  { value: "pubblicato", label: "Pubblicato" },
];

export default function NuovoPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    piattaforma: "instagram",
    tipoContenuto: "reel_hook",
    titolo: "",
    script: "",
    caption: "",
    hashtags: "",
    dataPubblicazione: new Date().toISOString().slice(0, 10),
    stato: "bozza",
    keyword: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const hashtags = formData.hashtags
        .split(",")
        .map((h) => h.trim().replace(/^#/, ""))
        .filter(Boolean);

      await createSocialPost({
        piattaforma: formData.piattaforma,
        tipoContenuto: formData.tipoContenuto,
        titolo: formData.titolo,
        script: formData.script || undefined,
        caption: formData.caption || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        dataPubblicazione: formData.dataPubblicazione,
        stato: formData.stato,
        keyword: formData.keyword || undefined,
      });
      router.push("/social");
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/social"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Nuovo Post Social
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Setup */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Impostazioni Post</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Piattaforma *</label>
              <select name="piattaforma" value={formData.piattaforma} onChange={handleChange} className={inputClass}>
                {piattaformeOpzioni.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Tipo Contenuto *</label>
              <select name="tipoContenuto" value={formData.tipoContenuto} onChange={handleChange} className={inputClass}>
                {tipiOpzioni.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Data Pubblicazione *</label>
              <input type="date" name="dataPubblicazione" value={formData.dataPubblicazione} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Stato</label>
              <select name="stato" value={formData.stato} onChange={handleChange} className={inputClass}>
                {statiOpzioni.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Contenuto</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Titolo / Hook *</label>
              <input
                type="text"
                name="titolo"
                value={formData.titolo}
                onChange={handleChange}
                required
                placeholder="Es. Il segreto per una pelle luminosa..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Keyword SEO</label>
              <input
                type="text"
                name="keyword"
                value={formData.keyword}
                onChange={handleChange}
                placeholder="Es. centro estetico campobasso"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Script / Testo Reel</label>
              <textarea
                name="script"
                value={formData.script}
                onChange={handleChange}
                rows={5}
                placeholder="Testo parlato o sceneggiatura del video..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Caption</label>
              <textarea
                name="caption"
                value={formData.caption}
                onChange={handleChange}
                rows={4}
                placeholder="Testo della didascalia per il post..."
                className={inputClass}
              />
              {formData.caption.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.caption.length} / 2200 caratteri
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">
                Hashtags (separati da virgola)
              </label>
              <input
                type="text"
                name="hashtags"
                value={formData.hashtags}
                onChange={handleChange}
                placeholder="centroestético, campobasso, skincare, benessere..."
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Inserisci senza # — verranno aggiunti automaticamente
              </p>
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
            {loading ? "Salvataggio..." : "Salva Post"}
          </button>
          <Link
            href="/social"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
