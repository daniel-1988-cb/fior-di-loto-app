"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Save, Trash2, Camera, Loader2, TrendingUp, TrendingDown, Calendar, Euro, X } from "lucide-react";
import {
  getStaffMember, updateStaff, uploadStaffAvatar,
  getStaffFerie, createFerie, deleteFerie,
  getStaffPerformance,
  Staff, StaffFerie, StaffPerformance,
} from "@/lib/actions/staff";

const GIORNI_SETTIMANA = [
  { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mer" },
  { value: 4, label: "Gio" }, { value: 5, label: "Ven" }, { value: 6, label: "Sab" }, { value: 0, label: "Dom" },
];
const RUOLI = ["titolare", "operatrice", "receptionist", "manager"];
const TABS = ["Panoramica", "Profilo", "Orari & Ferie"] as const;
type Tab = typeof TABS[number];

function trend(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function KpiCard({ label, value, prev, suffix = "" }: { label: string; value: number; prev: number; suffix?: string }) {
  const t = trend(value, prev);
  const up = t >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-1 text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-brown">{suffix}{value.toLocaleString("it-IT")}</p>
      <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(t)}% rispetto al periodo precedente
      </div>
    </div>
  );
}

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("Panoramica");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [ferie, setFerie] = useState<StaffFerie[]>([]);
  const [performance, setPerformance] = useState<StaffPerformance | null>(null);
  const [periodo, setPeriodo] = useState<"settimana" | "mese">("settimana");
  const [loadingPerf, setLoadingPerf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nome: "", cognome: "", ruolo: "operatrice", telefono: "", email: "",
    colore: "#e8a4a4", attiva: true, orario_inizio: "09:00", orario_fine: "19:00",
    giorni_lavoro: [1,2,3,4,5,6] as number[], obiettivo_mensile: 0, note: "",
  });
  const [ferieForm, setFerieForm] = useState({ data_inizio: "", data_fine: "", tipo: "ferie", note: "" });
  const [addingFerie, setAddingFerie] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [staffData, ferieData] = await Promise.all([getStaffMember(id), getStaffFerie(id)]);
        setStaff(staffData);
        setAvatarUrl((staffData as any).avatar_url || null);
        setFerie(ferieData);
        setFormData({
          nome: staffData.nome || "", cognome: staffData.cognome || "",
          ruolo: staffData.ruolo || "operatrice", telefono: staffData.telefono || "",
          email: staffData.email || "", colore: staffData.colore || "#e8a4a4",
          attiva: staffData.attiva, orario_inizio: staffData.orario_inizio?.slice(0,5) || "09:00",
          orario_fine: staffData.orario_fine?.slice(0,5) || "19:00",
          giorni_lavoro: staffData.giorni_lavoro || [1,2,3,4,5,6],
          obiettivo_mensile: Number(staffData.obiettivo_mensile) || 0, note: staffData.note || "",
        });
      } catch { router.push("/impostazioni"); }
      finally { setLoading(false); }
    }
    loadData();
  }, [id, router]);

  useEffect(() => {
    if (activeTab !== "Panoramica") return;
    setLoadingPerf(true);
    getStaffPerformance(id, periodo).then(setPerformance).catch(() => setPerformance(null)).finally(() => setLoadingPerf(false));
  }, [id, activeTab, periodo]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData(); fd.append("avatar", file);
      const url = await uploadStaffAvatar(id, fd);
      setAvatarUrl(url);
    } catch (err) { alert(err instanceof Error ? err.message : "Errore upload foto"); }
    finally { setUploadingAvatar(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nome.trim()) { alert("Il nome è obbligatorio"); return; }
    setSaving(true);
    try {
      await updateStaff(id, { ...formData, telefono: formData.telefono || null, email: formData.email || null, note: formData.note || null });
      router.push("/impostazioni");
    } catch { alert("Errore durante il salvataggio."); }
    finally { setSaving(false); }
  }

  async function handleAddFerie(e: React.FormEvent) {
    e.preventDefault();
    if (!ferieForm.data_inizio || !ferieForm.data_fine) { alert("Inserisci le date"); return; }
    setAddingFerie(true);
    try {
      await createFerie({ staff_id: id, ...ferieForm, note: ferieForm.note || undefined });
      setFerie(await getStaffFerie(id));
      setFerieForm({ data_inizio: "", data_fine: "", tipo: "ferie", note: "" });
    } catch { alert("Errore salvataggio ferie."); }
    finally { setAddingFerie(false); }
  }

  async function handleDeleteFerie(feriaId: string) {
    if (!confirm("Eliminare questa voce?")) return;
    try { await deleteFerie(feriaId); setFerie(prev => prev.filter(f => f.id !== feriaId)); }
    catch { alert("Errore eliminazione."); }
  }

  const inputClass = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="mb-0">
        <Link href="/impostazioni" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown">
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Link>

        {/* Staff card header — stile Fresha */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm mb-0">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: formData.colore }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={formData.nome} width={64} height={64} className="h-full w-full object-cover" />
                ) : formData.nome[0] || "?"}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-white shadow-md hover:bg-rose-dark">
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-brown truncate">
                {formData.nome} {formData.cognome}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{formData.ruolo}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${formData.attiva ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {formData.attiva ? "Attiva" : "Inattiva"}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex border-b border-border -mx-5 px-5 gap-0">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-3 pr-5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-rose text-rose" : "border-transparent text-muted-foreground hover:text-brown"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB: PANORAMICA ── */}
      {activeTab === "Panoramica" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brown">Dashboard del rendimento</h2>
            <select value={periodo} onChange={e => setPeriodo(e.target.value as "settimana" | "mese")}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-brown focus:outline-none">
              <option value="settimana">Settimana in corso</option>
              <option value="mese">Questo mese</option>
            </select>
          </div>

          {loadingPerf ? (
            <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-rose/30 border-t-rose" /></div>
          ) : performance ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Vendite" value={performance.vendite} prev={performance.venditePreced} suffix="€" />
                <KpiCard label="Appuntamenti" value={performance.appuntamenti} prev={performance.appuntamentiPrecedenti} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                  <p className="text-xs text-muted-foreground mb-1">No-show</p>
                  <p className="text-xl font-bold text-brown">{performance.noShow}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cancellati</p>
                  <p className="text-xl font-bold text-brown">{performance.cancellati}</p>
                </div>
              </div>

              {/* Obiettivo mensile */}
              {Number(formData.obiettivo_mensile) > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-brown">Obiettivo mensile</span>
                    <span className="text-muted-foreground">€{performance.vendite.toLocaleString("it-IT")} / €{Number(formData.obiettivo_mensile).toLocaleString("it-IT")}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all"
                      style={{ width: `${Math.min(100, Math.round((performance.vendite / Number(formData.obiettivo_mensile)) * 100))}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-right">
                    {Math.min(100, Math.round((performance.vendite / Number(formData.obiettivo_mensile)) * 100))}%
                  </p>
                </div>
              )}

              {/* Grafico */}
              {performance.dailyData.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="mb-3 text-sm font-medium text-brown">Vendite per giorno</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performance.dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => [`€${v}`, "Vendite"]} contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="vendite" fill="#C97A7A" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {performance.dailyData.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nessun appuntamento completato in questo periodo
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Impossibile caricare i dati
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PROFILO ── */}
      {activeTab === "Profilo" && (
        <form onSubmit={handleSave} className="mt-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Dati Personali</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Nome *</label>
                <input type="text" value={formData.nome} onChange={e => setFormData(p => ({...p, nome: e.target.value}))} required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Cognome</label>
                <input type="text" value={formData.cognome} onChange={e => setFormData(p => ({...p, cognome: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Ruolo</label>
                <select value={formData.ruolo} onChange={e => setFormData(p => ({...p, ruolo: e.target.value}))} className={inputClass}>
                  {RUOLI.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Telefono</label>
                <input type="tel" value={formData.telefono} onChange={e => setFormData(p => ({...p, telefono: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Colore Agenda</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formData.colore} onChange={e => setFormData(p => ({...p, colore: e.target.value}))} className="h-10 w-14 cursor-pointer rounded-lg border border-input" />
                  <span className="text-sm text-muted-foreground">{formData.colore}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Obiettivo Mensile (€)</label>
                <input type="number" value={formData.obiettivo_mensile} onChange={e => setFormData(p => ({...p, obiettivo_mensile: Number(e.target.value)}))} min={0} className={inputClass} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="attiva" checked={formData.attiva} onChange={e => setFormData(p => ({...p, attiva: e.target.checked}))} className="h-4 w-4 accent-rose" />
                <label htmlFor="attiva" className="text-sm font-medium text-brown">Operatrice attiva</label>
              </div>
            </div>
            {formData.note !== undefined && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-brown">Note</label>
                <textarea value={formData.note} onChange={e => setFormData(p => ({...p, note: e.target.value}))} rows={3} className={`${inputClass} resize-none`} />
              </div>
            )}
          </div>

          <button type="submit" disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brown px-4 py-3 text-sm font-semibold text-white hover:bg-brown/90 disabled:opacity-50">
            {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Salvataggio...</> : <><Save className="h-4 w-4" />Salva Modifiche</>}
          </button>
        </form>
      )}

      {/* ── TAB: ORARI & FERIE ── */}
      {activeTab === "Orari & Ferie" && (
        <div className="mt-4 space-y-6">
          {/* Orari */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Orario di Lavoro</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Inizio</label>
                <input type="time" value={formData.orario_inizio} onChange={e => setFormData(p => ({...p, orario_inizio: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">Fine</label>
                <input type="time" value={formData.orario_fine} onChange={e => setFormData(p => ({...p, orario_fine: e.target.value}))} className={inputClass} />
              </div>
            </div>
            <label className="mb-2 block text-sm font-medium text-brown">Giorni lavorativi</label>
            <div className="flex flex-wrap gap-2">
              {GIORNI_SETTIMANA.map(g => (
                <button key={g.value} type="button" onClick={() => setFormData(p => ({
                  ...p, giorni_lavoro: p.giorni_lavoro.includes(g.value)
                    ? p.giorni_lavoro.filter(d => d !== g.value)
                    : [...p.giorni_lavoro, g.value].sort((a,b) => a-b)
                }))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${formData.giorni_lavoro.includes(g.value) ? "bg-rose text-white" : "border border-border bg-card text-muted-foreground hover:border-rose/40"}`}>
                  {g.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => updateStaff(id, { orario_inizio: formData.orario_inizio, orario_fine: formData.orario_fine, giorni_lavoro: formData.giorni_lavoro }).then(() => alert("Orari salvati!"))}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brown px-4 py-2 text-sm font-medium text-white hover:bg-brown/90">
              <Save className="h-4 w-4" /> Salva Orari
            </button>
          </div>

          {/* Ferie */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Ferie & Assenze</h2>

            {ferie.length > 0 && (
              <div className="mb-4 space-y-2">
                {ferie.map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <span className="text-xs font-semibold capitalize text-brown">{f.tipo}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.data_inizio+"T00:00:00").toLocaleDateString("it-IT")} — {new Date(f.data_fine+"T00:00:00").toLocaleDateString("it-IT")}
                      </p>
                      {f.note && <p className="text-xs text-muted-foreground italic">{f.note}</p>}
                    </div>
                    <button onClick={() => handleDeleteFerie(f.id)} className="text-muted-foreground hover:text-red-500 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddFerie} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brown">Dal</label>
                  <input type="date" value={ferieForm.data_inizio} onChange={e => setFerieForm(p => ({...p, data_inizio: e.target.value}))} className={inputClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brown">Al</label>
                  <input type="date" value={ferieForm.data_fine} onChange={e => setFerieForm(p => ({...p, data_fine: e.target.value}))} className={inputClass} required />
                </div>
              </div>
              <select value={ferieForm.tipo} onChange={e => setFerieForm(p => ({...p, tipo: e.target.value}))} className={inputClass}>
                <option value="ferie">Ferie</option>
                <option value="permesso">Permesso</option>
                <option value="malattia">Malattia</option>
                <option value="altro">Altro</option>
              </select>
              <input type="text" value={ferieForm.note} onChange={e => setFerieForm(p => ({...p, note: e.target.value}))} placeholder="Note (opzionale)" className={inputClass} />
              <button type="submit" disabled={addingFerie}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50">
                {addingFerie ? "Salvataggio..." : "+ Aggiungi Assenza"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
