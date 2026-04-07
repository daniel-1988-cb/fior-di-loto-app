"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createStaff } from "@/lib/actions/staff";

const RUOLI = ["operatrice", "titolare", "receptionist", "manager"];

export default function NuovoStaffPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    ruolo: "operatrice",
    colore: "#e8a4a4",
    orario_inizio: "09:00",
    orario_fine: "19:00",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nome.trim()) { alert("Il nome è obbligatorio"); return; }
    setSaving(true);
    try {
      await createStaff({
        nome: formData.nome,
        cognome: formData.cognome || "",
        ruolo: formData.ruolo,
        colore: formData.colore,
        orario_inizio: formData.orario_inizio,
        orario_fine: formData.orario_fine,
      });
      router.push("/impostazioni");
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/impostazioni"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Nuova Operatrice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Aggiungi un nuovo membro al personale</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Informazioni</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="es. Jessica"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Cognome</label>
              <input
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleChange}
                placeholder="Opzionale"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Ruolo *</label>
              <select name="ruolo" value={formData.ruolo} onChange={handleChange} required className={inputClass}>
                {RUOLI.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Colore identificativo</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="colore"
                  value={formData.colore}
                  onChange={handleChange}
                  className="h-10 w-16 rounded-lg border border-input cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formData.colore}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Inizio turno</label>
              <input
                type="time"
                name="orario_inizio"
                value={formData.orario_inizio}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Fine turno</label>
              <input
                type="time"
                name="orario_fine"
                value={formData.orario_fine}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rose px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio..." : "Aggiungi Operatrice"}
          </button>
          <Link
            href="/impostazioni"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
