"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Pencil, BookOpen, Plane, Coffee, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createBlockedSlot, type BlockedSlotTipo } from "@/lib/actions/blocked-slots";
import { getStaff, type Staff } from "@/lib/actions/staff";
import { useToast } from "@/lib/hooks/use-toast";

type TipoPreset = {
 id: BlockedSlotTipo;
 label: string;
 description: string;
 icon: LucideIcon;
 defaultDurationMin: number;
};

const TIPO_PRESETS: TipoPreset[] = [
 { id: "personalizza", label: "Personalizza", description: "Nuovo orario bloccato", icon: Pencil, defaultDurationMin: 30 },
 { id: "formazione", label: "Attività di formazione", description: "Corso, aggiornamento", icon: BookOpen, defaultDurationMin: 60 },
 { id: "ferie", label: "Ferie", description: "Giorno di riposo", icon: Plane, defaultDurationMin: 480 },
 { id: "pausa", label: "Pausa", description: "Pausa pranzo o break", icon: Coffee, defaultDurationMin: 60 },
 { id: "altro", label: "Altro", description: "Altro tipo di blocco", icon: MoreHorizontal, defaultDurationMin: 30 },
];

function addMinutesHHMM(hhmm: string, minutes: number): string {
 const [h, m] = hhmm.split(":").map(Number);
 const total = h * 60 + m + minutes;
 const endH = Math.floor(total / 60) % 24;
 const endM = total % 60;
 return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function diffMinutes(a: string, b: string): number {
 const [ah, am] = a.split(":").map(Number);
 const [bh, bm] = b.split(":").map(Number);
 return (bh * 60 + bm) - (ah * 60 + am);
}

function BloccaForm() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [loading, setLoading] = useState(false);
 const [staffList, setStaffList] = useState<Staff[]>([]);
 const toast = useToast();

 const paramData = searchParams.get("data");
 const paramOra = searchParams.get("ora");
 const paramStaffId = searchParams.get("staffId");

 const [tipo, setTipo] = useState<BlockedSlotTipo>("personalizza");
 const [titolo, setTitolo] = useState("");
 const [data, setData] = useState(paramData || new Date().toISOString().slice(0, 10));
 const [oraInizio, setOraInizio] = useState(paramOra || "09:00");
 const [oraFine, setOraFine] = useState(() => addMinutesHHMM(paramOra || "09:00", 30));
 const [staffId, setStaffId] = useState(paramStaffId || "");
 const [note, setNote] = useState("");

 useEffect(() => {
  getStaff(true).then(setStaffList);
 }, []);

 // Quando cambia il tipo, aggiorna oraFine con la durata di default (solo se l'utente non ha ancora toccato oraFine)
 function handleTipoChange(newTipo: BlockedSlotTipo) {
  setTipo(newTipo);
  const preset = TIPO_PRESETS.find((t) => t.id === newTipo);
  if (preset) setOraFine(addMinutesHHMM(oraInizio, preset.defaultDurationMin));
 }

 function handleOraInizioChange(e: React.ChangeEvent<HTMLInputElement>) {
  const newInizio = e.target.value;
  setOraInizio(newInizio);
  // Mantieni la durata attuale
  const currentDuration = diffMinutes(oraInizio, oraFine);
  if (currentDuration > 0) setOraFine(addMinutesHHMM(newInizio, currentDuration));
 }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (oraFine <= oraInizio) {
   toast.error("Ora fine deve essere dopo ora inizio");
   return;
  }
  setLoading(true);
  try {
   const res = await createBlockedSlot({
    staffId: staffId || null,
    data,
    oraInizio,
    oraFine,
    tipo,
    titolo: titolo.trim() || null,
    note: note.trim() || null,
   });
   if (res.ok) {
    router.push(`/agenda?date=${data}`);
   } else {
    toast.error(`Errore: ${res.error}`);
   }
  } catch (err) {
   console.error(err);
   toast.error("Errore durante il salvataggio. Riprova.");
  } finally {
   setLoading(false);
  }
 }

 const duration = diffMinutes(oraInizio, oraFine);
 const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

 return (
  <div className="mx-auto max-w-2xl">
   <div className="mb-4">
    <Link
     href="/agenda"
     className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="h-4 w-4" />
     Agenda
    </Link>
   </div>

   <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
    Aggiungi fascia oraria bloccata
   </h1>

   <form onSubmit={handleSubmit} className="space-y-6">
    {/* Tipo preset cards */}
    <div>
     <label className="mb-2 block text-sm font-medium text-foreground">
      Tipo di fascia oraria bloccata
     </label>
     <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TIPO_PRESETS.map((preset) => {
       const Icon = preset.icon;
       const active = tipo === preset.id;
       return (
        <button
         key={preset.id}
         type="button"
         onClick={() => handleTipoChange(preset.id)}
         aria-pressed={active}
         className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
          active
           ? "border-rose bg-rose/5"
           : "border-border bg-card hover:border-muted-foreground"
         }`}
        >
         <Icon className={`h-5 w-5 ${active ? "text-rose" : "text-muted-foreground"}`} />
         <div>
          <p className="text-sm font-semibold text-foreground">{preset.label}</p>
          <p className="text-xs text-muted-foreground">{preset.description}</p>
         </div>
        </button>
       );
      })}
     </div>
    </div>

    {/* Titolo */}
    <div>
     <label htmlFor="titolo" className="mb-1.5 block text-sm font-medium text-foreground">
      Titolo <span className="text-muted-foreground">(Facoltativo)</span>
     </label>
     <input
      id="titolo"
      type="text"
      value={titolo}
      onChange={(e) => setTitolo(e.target.value)}
      placeholder="es. Pranzo di lavoro"
      maxLength={200}
      className={inputClass}
     />
    </div>

    {/* Data */}
    <div>
     <label htmlFor="data" className="mb-1.5 block text-sm font-medium text-foreground">
      Data
     </label>
     <input
      id="data"
      type="date"
      value={data}
      onChange={(e) => setData(e.target.value)}
      required
      className={inputClass}
     />
    </div>

    {/* Orari */}
    <div className="grid grid-cols-2 gap-4">
     <div>
      <label htmlFor="oraInizio" className="mb-1.5 block text-sm font-medium text-foreground">
       Orario di inizio
      </label>
      <input
       id="oraInizio"
       type="time"
       value={oraInizio}
       onChange={handleOraInizioChange}
       required
       className={inputClass}
      />
     </div>
     <div>
      <label htmlFor="oraFine" className="mb-1.5 block text-sm font-medium text-foreground">
       Orario di fine
      </label>
      <input
       id="oraFine"
       type="time"
       value={oraFine}
       onChange={(e) => setOraFine(e.target.value)}
       required
       className={inputClass}
      />
      {duration > 0 && (
       <p className="mt-1 text-xs text-muted-foreground">
        Durata: {duration >= 60 ? `${Math.floor(duration / 60)}h ` : ""}
        {duration % 60 > 0 ? `${duration % 60} min` : duration >= 60 ? "" : "0 min"}
       </p>
      )}
     </div>
    </div>

    {/* Membri team */}
    <div>
     <label htmlFor="staffId" className="mb-1.5 block text-sm font-medium text-foreground">
      Membri del team
     </label>
     <select
      id="staffId"
      value={staffId}
      onChange={(e) => setStaffId(e.target.value)}
      className={inputClass}
     >
      <option value="">Tutti i membri</option>
      {staffList.map((s) => (
       <option key={s.id} value={s.id}>
        {s.nome} {s.cognome}
       </option>
      ))}
     </select>
    </div>

    {/* Note */}
    <div>
     <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-foreground">
      Note <span className="text-muted-foreground">(Facoltativo)</span>
     </label>
     <textarea
      id="note"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      rows={3}
      maxLength={2000}
      className={inputClass}
     />
    </div>

    {/* Submit */}
    <div className="flex items-center gap-3 pt-2">
     <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
     >
      <Save className="h-4 w-4" />
      {loading ? "Salvataggio..." : "Salva"}
     </button>
     <Link
      href="/agenda"
      className="text-sm text-muted-foreground hover:text-foreground"
     >
      Annulla
     </Link>
    </div>
   </form>
  </div>
 );
}

export default function BloccaPage() {
 return (
  <Suspense fallback={<div className="p-6 text-muted-foreground">Caricamento...</div>}>
   <BloccaForm />
  </Suspense>
 );
}
