"use client";

import { useState } from "react";
import Image from "next/image";
import { Target, Check, Pencil } from "lucide-react";
import { updateStaff, Staff } from "@/lib/actions/staff";

export function ObiettiviTeam({ staffList }: { staffList: Staff[] }) {
 const [editingId, setEditingId] = useState<string | null>(null);
 const [values, setValues] = useState<Record<string, number>>(
  Object.fromEntries(staffList.map((s) => [s.id, Number(s.obiettivo_mensile) || 0]))
 );
 const [saving, setSaving] = useState<string | null>(null);

 async function handleSave(id: string) {
  setSaving(id);
  try {
   await updateStaff(id, { obiettivo_mensile: values[id] });
   setEditingId(null);
  } catch {
   alert("Errore salvataggio");
  } finally {
   setSaving(null);
  }
 }

 if (staffList.length === 0) return null;

 return (
  <div className="mb-6 rounded-xl border border-border bg-card p-6 ">
   <div className="mb-4 flex items-center gap-2">
    <Target className="h-5 w-5 text-rose" />
    <h2 className="font-semibold text-brown">Obiettivi Mensili Team</h2>
   </div>

   <div className="space-y-3">
    {staffList.filter(s => s.attiva).map((staff) => {
     const obiettivo = values[staff.id] || 0;
     const isEditing = editingId === staff.id;

     return (
      <div key={staff.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
       {/* Avatar */}
       <div
        className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
        style={{ backgroundColor: staff.colore }}
       >
        {staff.avatar_url ? (
         <Image src={staff.avatar_url} alt={staff.nome} width={36} height={36} className="h-full w-full object-cover" />
        ) : staff.nome[0]}
       </div>

       {/* Nome */}
       <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brown truncate">{staff.nome} {staff.cognome || ""}</p>
        <p className="text-xs text-muted-foreground capitalize">{staff.ruolo}</p>
       </div>

       {/* Obiettivo */}
       <div className="flex items-center gap-2">
        {isEditing ? (
         <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">€</span>
          <input
           type="number"
           value={values[staff.id]}
           onChange={(e) => setValues(v => ({ ...v, [staff.id]: Number(e.target.value) }))}
           className="w-24 rounded-lg border border-rose px-2 py-1 text-sm text-brown focus:outline-none focus:ring-2 focus:ring-rose/20"
           min={0}
           step={100}
           autoFocus
          />
          <button
           onClick={() => handleSave(staff.id)}
           disabled={saving === staff.id}
           className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose text-white hover:bg-rose-dark disabled:opacity-50"
          >
           <Check className="h-3.5 w-3.5" />
          </button>
          <button
           onClick={() => setEditingId(null)}
           className="text-xs text-muted-foreground hover:text-brown px-1"
          >
           ✕
          </button>
         </div>
        ) : (
         <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brown">
           {obiettivo > 0 ? `€${obiettivo.toLocaleString("it-IT")}` : "—"}
          </span>
          <button
           onClick={() => setEditingId(staff.id)}
           className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-rose hover:text-rose"
          >
           <Pencil className="h-3.5 w-3.5" />
          </button>
         </div>
        )}
       </div>
      </div>
     );
    })}
   </div>

   <p className="mt-3 text-xs text-muted-foreground">
    Clicca la matita per modificare l&apos;obiettivo mensile di ogni operatrice
   </p>
  </div>
 );
}
