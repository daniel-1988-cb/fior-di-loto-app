"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, Trash2, Camera, Loader2 } from "lucide-react";
import { getStaffMember, updateStaff, uploadStaffAvatar, getStaffFerie, createFerie, deleteFerie, Staff, StaffFerie } from "@/lib/actions/staff";

const GIORNI_SETTIMANA = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
];

const RUOLI = ["titolare", "operatrice", "receptionist", "manager"];

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ferie, setFerie] = useState<StaffFerie[]>([]);
  const [addingFerie, setAddingFerie] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    ruolo: "operatrice",
    telefono: "",
    email: "",
    colore: "#e8a4a4",
    attiva: true,
    orario_inizio: "09:00",
    orario_fine: "19:00",
    giorni_lavoro: [1, 2, 3, 4, 5, 6] as number[],
    obiettivo_mensile: 0,
    note: "",
  });

  const [ferieForm, setFerieForm] = useState({
    data_inizio: "",
    data_fine: "",
    tipo: "ferie",
    note: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [staffData, ferieData] = await Promise.all([
          getStaffMember(id),
          getStaffFerie(id),
        ]);
        setStaff(staffData);
        setAvatarUrl(staffData.avatar_url || null);
        setFerie(ferieData);
        setFormData({
          nome: staffData.nome || "",
          cognome: staffData.cognome || "",
          ruolo: staffData.ruolo || "operatrice",
          telefono: staffData.telefono || "",
          email: staffData.email || "",
          colore: staffData.colore || "#e8a4a4",
          attiva: staffData.attiva,
          orario_inizio: staffData.orario_inizio?.slice(0, 5) || "09:00",
          orario_fine: staffData.orario_fine?.slice(0, 5) || "19:00",
          giorni_lavoro: staffData.giorni_lavoro || [1, 2, 3, 4, 5, 6],
          obiettivo_mensile: Number(staffData.obiettivo_mensile) || 0,
          note: staffData.note || "",
        });
      } catch (err) {
        console.error("Errore caricamento:", err);
        alert("Impossibile caricare i dati del personale.");
        router.push("/impostazioni");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  function toggleGiorno(val: number) {
    setFormData((prev) => {
      const giorni = prev.giorni_lavoro.includes(val)
        ? prev.giorni_lavoro.filter((g) => g !== val)
        : [...prev.giorni_lavoro, val].sort((a, b) => a - b);
      return { ...prev, giorni_lavoro: giorni };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nome.trim()) { alert("Il nome è obbligatorio"); return; }
    setSaving(true);
    try {
      await updateStaff(id, {
        nome: formData.nome,
        cognome: formData.cognome,
        ruolo: formData.ruolo,
        telefono: formData.telefono || null,
        email: formData.email || null,
        colore: formData.colore,
        attiva: formData.attiva,
        orario_inizio: formData.orario_inizio,
        orario_fine: formData.orario_fine,
        giorni_lavoro: formData.giorni_lavoro,
        obiettivo_mensile: formData.obiettivo_mensile,
        note: formData.note || null,
      });
      router.push("/impostazioni");
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFerie(e: React.FormEvent) {
    e.preventDefault();
    if (!ferieForm.data_inizio || !ferieForm.data_fine) {
      alert("Inserisci le date di inizio e fine");
      return;
    }
    setAddingFerie(true);
    try {
      await createFerie({
        staff_id: id,
        data_inizio: ferieForm.data_inizio,
        data_fine: ferieForm.data_fine,
        tipo: ferieForm.tipo,
        note: ferieForm.note || undefined,
      });
      const updated = await getStaffFerie(id);
      setFerie(updated);
      setFerieForm({ data_inizio: "", data_fine: "", tipo: "ferie", note: "" });
    } catch (err) {
      console.error("Errore aggiunta ferie:", err);
      alert("Errore durante il salvataggio delle ferie.");
    } finally {
      setAddingFerie(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const url = await uploadStaffAvatar(id, fd);
      setAvatarUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore upload foto");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteFerie(feriaId: string) {
    if (!confirm("Eliminare questa voce?")) return;
    try {
      await deleteFerie(feriaId);
      setFerie((prev) => prev.filter((f) => f.id !== feriaId));
    } catch (err) {
      console.error("Errore eliminazione:", err);
      alert("Errore durante l'eliminazione.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Caricamento...</div>
    );
  }

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
          {staff?.nome} {staff?.cognome}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{staff?.ruolo}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Profilo */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Profilo</h2>

          {/* Avatar */}
          <div className="mb-5 flex items-center gap-4">
            <div className="relative">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white overflow-hidden"
                style={{ backgroundColor: formData.colore }}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <span>{formData.nome?.[0] || "?"}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose text-white shadow-md hover:bg-rose-dark"
              >
                {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-brown">Foto profilo</p>
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP · max 2MB</p>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => { setAvatarUrl(null); updateStaff(id, { avatar_url: null }); }}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  Rimuovi foto
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
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
              <label className="mb-1 block text-sm font-medium text-brown">Cognome</label>
              <input
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Ruolo</label>
              <select name="ruolo" value={formData.ruolo} onChange={handleChange} className={inputClass}>
                {RUOLI.map((r) => (
                  <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Telefono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="es. 3331234567"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nome@email.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Colore</label>
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
          </div>

          {/* Attiva toggle */}
          <div className="mt-4 flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="attiva"
                checked={formData.attiva}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose" />
            </label>
            <span className="text-sm font-medium text-brown">
              {formData.attiva ? "Attiva" : "Inattiva"}
            </span>
          </div>
        </div>

        {/* Orari di Lavoro */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Orari di Lavoro</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
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
          <div>
            <label className="mb-2 block text-sm font-medium text-brown">Giorni lavorativi</label>
            <div className="flex flex-wrap gap-2">
              {GIORNI_SETTIMANA.map((g) => {
                const active = formData.giorni_lavoro.includes(g.value);
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGiorno(g.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-rose text-white"
                        : "border border-border bg-card text-muted-foreground hover:bg-cream-dark hover:text-brown"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Obiettivo Mensile */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Obiettivo Mensile</h2>
          <div className="flex items-center gap-2 max-w-xs">
            <span className="text-sm font-medium text-brown">€</span>
            <input
              type="number"
              name="obiettivo_mensile"
              value={formData.obiettivo_mensile}
              onChange={handleChange}
              min="0"
              step="50"
              placeholder="0"
              className={inputClass}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Fatturato mensile target per questa operatrice</p>
        </div>

        {/* Note */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Note</h2>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            rows={3}
            placeholder="Note interne..."
            className={inputClass}
          />
        </div>

        {/* Pulsante Salva */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rose px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </button>
          <Link
            href="/impostazioni"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
          >
            Annulla
          </Link>
        </div>
      </form>

      {/* Sezione Ferie/Permessi */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-brown">Ferie e Permessi</h2>

        {/* Lista ferie */}
        {ferie.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">Nessuna assenza registrata.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {ferie.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-border bg-cream-dark/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-brown capitalize">{f.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.data_inizio} → {f.data_fine}
                    {f.note ? ` — ${f.note}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteFerie(f.id)}
                  className="ml-4 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form aggiunta assenza */}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-brown">Aggiungi Assenza</h3>
          <form onSubmit={handleAddFerie} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Data inizio *</label>
              <input
                type="date"
                value={ferieForm.data_inizio}
                onChange={(e) => setFerieForm((p) => ({ ...p, data_inizio: e.target.value }))}
                required
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Data fine *</label>
              <input
                type="date"
                value={ferieForm.data_fine}
                onChange={(e) => setFerieForm((p) => ({ ...p, data_fine: e.target.value }))}
                required
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Tipo</label>
              <select
                value={ferieForm.tipo}
                onChange={(e) => setFerieForm((p) => ({ ...p, tipo: e.target.value }))}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              >
                <option value="ferie">Ferie</option>
                <option value="permesso">Permesso</option>
                <option value="malattia">Malattia</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Note</label>
              <input
                type="text"
                value={ferieForm.note}
                onChange={(e) => setFerieForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Opzionale"
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={addingFerie}
                className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
              >
                {addingFerie ? "Salvataggio..." : "+ Aggiungi assenza"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
