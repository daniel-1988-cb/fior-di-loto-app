"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createAppointment } from "@/lib/actions/appointments";
import { getServices } from "@/lib/actions/services";
import { getStaff, Staff } from "@/lib/actions/staff";
import { getActivePricingRules } from "@/lib/actions/dynamic-pricing";
import { applyRules, type PricingResult } from "@/lib/pricing/apply-rules";
import type { PricingRule } from "@/lib/types/pricing";
import { ClientSearchCombobox } from "@/components/clienti/client-search-combobox";
import { useToast } from "@/lib/hooks/use-toast";

type ServiceOption = { id: string; nome: string; categoria: string; durata: number; prezzo: number };

/** Costruisce un Date locale a partire da `YYYY-MM-DD` + `HH:MM`. */
function buildDateTime(data: string, oraInizio: string): Date | null {
 if (!data || !oraInizio) return null;
 const [y, m, d] = data.split("-").map(Number);
 const [hh, mm] = oraInizio.split(":").map(Number);
 if (
  !Number.isFinite(y) ||
  !Number.isFinite(m) ||
  !Number.isFinite(d) ||
  !Number.isFinite(hh) ||
  !Number.isFinite(mm)
 ) {
  return null;
 }
 return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/** Etichetta sintetica per la regola applicata (es: "Sconto Mattina (-10%)"). */
function ruleLabel(rule: PricingRule): string {
 const sign = rule.adjustType === "sconto" ? "-" : "+";
 const unit = rule.adjustKind === "percentuale" ? "%" : "€";
 return `${rule.nome} (${sign}${rule.adjustValue}${unit})`;
}

function NuovoAppuntamentoForm() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const [loading, setLoading] = useState(false);
 const [services, setServices] = useState<ServiceOption[]>([]);
 const [staffList, setStaffList] = useState<Staff[]>([]);
 const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
 const toast = useToast();

 // Read pre-fill values from URL
 const paramData = searchParams.get("data");
 const paramOra = searchParams.get("ora");
 const paramStaffId = searchParams.get("staffId");
 const paramClientId = searchParams.get("clientId");
 const paramNote = searchParams.get("note");

 const [formData, setFormData] = useState({
  clientId: paramClientId || "",
  serviceId: "",
  staffId: paramStaffId || "",
  data: paramData || new Date().toISOString().slice(0, 10),
  oraInizio: paramOra || "09:00",
  oraFine: "",
  note: paramNote || "",
 });

 useEffect(() => {
  async function loadData() {
   const [serviceList, staffData, rules] = await Promise.all([
    getServices(),
    getStaff(true),
    getActivePricingRules().catch((err) => {
     // Le regole sono opzionali: se falla, prosegui senza preview pricing.
     console.error("Errore caricamento pricing rules:", err);
     return [] as PricingRule[];
    }),
   ]);
   setServices(serviceList as unknown as ServiceOption[]);
   setStaffList(staffData);
   setPricingRules(rules);
  }
  loadData();
 }, []);

 // Auto-fill oraFine based on service duration
 function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
  const serviceId = e.target.value;
  setFormData((prev) => {
   const service = services.find((s) => s.id === serviceId);
   if (service && prev.oraInizio) {
    const [h, m] = prev.oraInizio.split(":").map(Number);
    const totalMin = h * 60 + m + service.durata;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return {
     ...prev,
     serviceId,
     oraFine: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    };
   }
   return { ...prev, serviceId };
  });
 }

 function handleChange(
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
 ) {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
 }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!formData.clientId) { toast.error("Seleziona un cliente"); return; }
  if (!formData.serviceId) { toast.error("Seleziona un servizio"); return; }
  setLoading(true);

  try {
   await createAppointment({
    clientId: formData.clientId,
    serviceId: formData.serviceId,
    data: formData.data,
    oraInizio: formData.oraInizio,
    oraFine: formData.oraFine || undefined,
    note: formData.note || undefined,
    staffId: formData.staffId || undefined,
   });
   router.push(`/agenda?data=${formData.data}`);
  } catch (err) {
   console.error("Errore salvataggio:", err);
   toast.error("Errore durante il salvataggio. Riprova.");
  } finally {
   setLoading(false);
  }
 }

 const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

 // Group services by categoria
 const servicesByCategoria: Record<string, ServiceOption[]> = {};
 for (const s of services) {
  if (!servicesByCategoria[s.categoria]) servicesByCategoria[s.categoria] = [];
  servicesByCategoria[s.categoria].push(s);
 }

 const selectedStaff = staffList.find((s) => s.id === formData.staffId);
 const selectedService = services.find((s) => s.id === formData.serviceId);

 // Preview pricing: ricalcola quando cambia servizio, data o ora.
 // Non muta nulla in DB — il pricing definitivo si applica al checkout.
 const pricingPreview = useMemo<PricingResult | null>(() => {
  if (!selectedService) return null;
  const when = buildDateTime(formData.data, formData.oraInizio);
  if (!when) return null;
  const basePrice = Number(selectedService.prezzo);
  if (!Number.isFinite(basePrice)) return null;
  return applyRules(basePrice, pricingRules, {
   when,
   serviceId: selectedService.id,
  });
 }, [selectedService, formData.data, formData.oraInizio, pricingRules]);

 return (
  <div>
   <div className="mb-6">
    <Link
     href="/agenda"
     className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
    >
     <ArrowLeft className="h-4 w-4" />
     Indietro
    </Link>
    <h1 className="text-3xl font-bold text-brown">
     Nuovo Appuntamento
    </h1>
   </div>

   <form onSubmit={handleSubmit} className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Cliente e Servizio</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
       <label htmlFor="nuovo-appt-cliente" className="mb-1 block text-sm font-medium text-brown">Cliente *</label>
       <ClientSearchCombobox
        inputId="nuovo-appt-cliente"
        name="clientId"
        required
        value={formData.clientId || null}
        onChange={(id) =>
         setFormData((prev) => ({ ...prev, clientId: id ?? "" }))
        }
       />
      </div>
      <div>
       <label htmlFor="nuovo-appt-servizio" className="mb-1 block text-sm font-medium text-brown">Servizio *</label>
       <select id="nuovo-appt-servizio" name="serviceId" value={formData.serviceId} onChange={handleServiceChange} required className={inputClass}>
        <option value="">Seleziona servizio...</option>
        {Object.entries(servicesByCategoria).map(([cat, svcs]) => (
         <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
          {svcs.map((s) => (
           <option key={s.id} value={s.id}>
            {s.nome} — {s.durata} min — €{Number(s.prezzo).toFixed(2)}
           </option>
          ))}
         </optgroup>
        ))}
       </select>
       {pricingPreview && pricingPreview.applied && (
        <div className="mt-2 space-y-1">
         <p className="text-xs text-muted-foreground">
          Il prezzo finale viene calcolato in cassa al checkout in base alla data/ora dell&apos;appuntamento.
         </p>
         <div className="text-sm text-brown">
          Prezzo aggiustato:{" "}
          <span className="text-muted-foreground line-through">
           €{pricingPreview.originalPrice.toFixed(2)}
          </span>{" "}
          <span className="font-bold text-brown">
           €{pricingPreview.adjustedPrice.toFixed(2)}
          </span>
         </div>
         <span
          className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
          title={pricingPreview.applied.descrizione ?? undefined}
         >
          {ruleLabel(pricingPreview.applied)}
         </span>
        </div>
       )}
      </div>
     </div>

     {/* Operatrice */}
     <div className="mt-4">
      <label htmlFor="nuovo-appt-staff" className="mb-1 block text-sm font-medium text-brown">Operatrice</label>
      <div className="flex items-center gap-2">
       {selectedStaff && (
        <div
         className="h-5 w-5 rounded-full shrink-0"
         style={{ backgroundColor: selectedStaff.colore }}
        />
       )}
       <select id="nuovo-appt-staff" name="staffId" value={formData.staffId} onChange={handleChange} className={inputClass}>
        <option value="">— Nessuna operatrice —</option>
        {staffList.map((s) => (
         <option key={s.id} value={s.id}>
          {s.nome} {s.cognome ? s.cognome : ""} ({s.ruolo})
         </option>
        ))}
       </select>
      </div>
     </div>
    </div>

    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Data e Ora</h2>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
       <label htmlFor="nuovo-appt-data" className="mb-1 block text-sm font-medium text-brown">Data *</label>
       <input id="nuovo-appt-data" type="date" name="data" value={formData.data} onChange={handleChange} required className={inputClass} />
      </div>
      <div>
       <label htmlFor="nuovo-appt-ora-inizio" className="mb-1 block text-sm font-medium text-brown">Ora Inizio *</label>
       <input id="nuovo-appt-ora-inizio" type="time" name="oraInizio" value={formData.oraInizio} onChange={handleChange} step={1800} required className={inputClass} />
      </div>
      <div>
       <label htmlFor="nuovo-appt-ora-fine" className="mb-1 block text-sm font-medium text-brown">Ora Fine</label>
       <input id="nuovo-appt-ora-fine" type="time" name="oraFine" value={formData.oraFine} onChange={handleChange} step={1800} className={inputClass} />
      </div>
     </div>
    </div>

    <div className="rounded-xl border border-border bg-card p-6 ">
     <h2 className="mb-4 font-semibold text-brown">Note</h2>
     <label htmlFor="nuovo-appt-note" className="mb-1 block text-sm font-medium text-brown">Note</label>
     <textarea
      id="nuovo-appt-note"
      name="note"
      value={formData.note}
      onChange={handleChange}
      rows={3}
      placeholder="Note sull'appuntamento..."
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
      {loading ? "Salvataggio..." : "Salva Appuntamento"}
     </button>
     <Link
      href="/agenda"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
     >
      Annulla
     </Link>
    </div>
   </form>
  </div>
 );
}

export default function NuovoAppuntamentoPage() {
 return (
  <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento...</div>}>
   <NuovoAppuntamentoForm />
  </Suspense>
 );
}
