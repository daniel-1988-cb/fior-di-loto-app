"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createAppointment } from "@/lib/actions/appointments";
import { getClients } from "@/lib/actions/messages";
import { getServices } from "@/lib/actions/services";

type ClientOption = { id: string; nome: string; cognome: string; telefono: string | null };
type ServiceOption = { id: string; nome: string; categoria: string; durata: number; prezzo: number };

function NuovoAppuntamentoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Read pre-fill values from URL
  const paramData = searchParams.get("data");
  const paramOra = searchParams.get("ora");

  const [formData, setFormData] = useState({
    clientId: "",
    serviceId: "",
    data: paramData || new Date().toISOString().slice(0, 10),
    oraInizio: paramOra || "09:00",
    oraFine: "",
    note: "",
  });

  useEffect(() => {
    async function loadData() {
      const [clientList, serviceList] = await Promise.all([
        getClients(),
        getServices(),
      ]);
      setClients(clientList as unknown as ClientOption[]);
      setServices(serviceList as unknown as ServiceOption[]);
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
    if (!formData.clientId) { alert("Seleziona un cliente"); return; }
    if (!formData.serviceId) { alert("Seleziona un servizio"); return; }
    setLoading(true);

    try {
      await createAppointment({
        clientId: formData.clientId,
        serviceId: formData.serviceId,
        data: formData.data,
        oraInizio: formData.oraInizio,
        oraFine: formData.oraFine || undefined,
        note: formData.note || undefined,
      });
      router.push(`/agenda?data=${formData.data}`);
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  // Group services by categoria
  const servicesByCategoria: Record<string, ServiceOption[]> = {};
  for (const s of services) {
    if (!servicesByCategoria[s.categoria]) servicesByCategoria[s.categoria] = [];
    servicesByCategoria[s.categoria].push(s);
  }

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
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Nuovo Appuntamento
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Cliente e Servizio</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Cliente *</label>
              <select name="clientId" value={formData.clientId} onChange={handleChange} required className={inputClass}>
                <option value="">Seleziona cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cognome}
                    {c.telefono ? ` — ${c.telefono}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Servizio *</label>
              <select name="serviceId" value={formData.serviceId} onChange={handleServiceChange} required className={inputClass}>
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
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Data e Ora</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Data *</label>
              <input type="date" name="data" value={formData.data} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Ora Inizio *</label>
              <input type="time" name="oraInizio" value={formData.oraInizio} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brown">Ora Fine</label>
              <input type="time" name="oraFine" value={formData.oraFine} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Note</h2>
          <textarea
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
