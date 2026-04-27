"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
 X,
 Search,
 CalendarDays,
 Scissors,
 Package,
 Repeat,
 Ticket,
 type LucideIcon,
} from "lucide-react";
import { getAppointment } from "@/lib/actions/appointments";
import { getActivePricingRules } from "@/lib/actions/dynamic-pricing";
import { applyRules } from "@/lib/pricing/apply-rules";
import type { PricingRule } from "@/lib/types/pricing";
import { useCart } from "@/lib/cart/storage";
import type { CardRegaloPreset } from "@/lib/cart/types";
import {
 AddItemsModal,
 type AddItemsCategory,
 type PickedItem,
} from "@/components/agenda/checkout/add-items-modal";
import { CartSidebar } from "@/components/agenda/checkout/cart-sidebar";
import { QuickSaleTiles } from "@/components/agenda/checkout/quick-sale-tiles";

type AppointmentData = {
 id: string;
 stato: string;
 data: string;
 ora_inizio: string;
 pagato_at?: string | null;
 staff_id?: string | null;
 client_id?: string | null;
 clients: { id: string; nome: string; cognome: string; telefono: string | null } | null;
 services: { id: string; nome: string; durata: number; prezzo: number; categoria: string } | null;
};

type CategoryCard = {
 id: "appuntamenti" | AddItemsCategory | "abbonamenti";
 label: string;
 icon: LucideIcon;
 disabled?: boolean;
 note?: string;
};

const CATEGORIES: CategoryCard[] = [
 { id: "appuntamenti", label: "Appuntamenti", icon: CalendarDays, disabled: true, note: "Prossimamente" },
 { id: "servizi", label: "Servizi", icon: Scissors },
 { id: "prodotti", label: "Prodotti", icon: Package },
 { id: "abbonamenti", label: "Abbonamenti", icon: Repeat, disabled: true, note: "Prossimamente" },
 { id: "buoni", label: "Buoni", icon: Ticket },
];

/** Costruisce un Date dal `data` (YYYY-MM-DD) e `ora_inizio` (HH:MM[:SS]) di un
 * appuntamento. Usato come `when` per il match delle pricing rules. */
function appointmentDateTime(date: string, time: string): Date {
 const [y, m, d] = date.split("-").map(Number);
 const [hh, mm] = time.split(":").map(Number);
 return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/** Etichetta sintetica per la regola applicata, da mostrare in UI. */
function ruleLabel(rule: PricingRule): string {
 const sign = rule.adjustType === "sconto" ? "-" : "+";
 const unit = rule.adjustKind === "percentuale" ? "%" : "€";
 return `${rule.nome} (${sign}${rule.adjustValue}${unit})`;
}

function CarrelloPageInner({ id }: { id: string }) {
 const router = useRouter();
 const [appointment, setAppointment] = useState<AppointmentData | null>(null);
 const [loading, setLoading] = useState(true);
 const [prepopulated, setPrepopulated] = useState(false);
 const [pricingRules, setPricingRules] = useState<PricingRule[] | null>(null);
 const [query, setQuery] = useState("");
 const [modalCategory, setModalCategory] = useState<AddItemsCategory | null>(null);

 const clientId = appointment?.clients?.id ?? null;
 const { cart, mounted, addItem, removeItem, setQuantity } = useCart(
  id,
  clientId,
 );

 // Load appointment + active pricing rules in parallelo.
 useEffect(() => {
  let cancelled = false;
  async function load() {
   try {
    const [appt, rules] = await Promise.all([
     getAppointment(id),
     getActivePricingRules().catch((err) => {
      // Le regole sono opzionali: se falla, prosegui senza pricing dinamico.
      console.error("Errore caricamento pricing rules:", err);
      return [] as PricingRule[];
     }),
    ]);
    if (!cancelled) {
     setAppointment(appt as unknown as AppointmentData);
     setPricingRules(rules);
    }
   } catch (err) {
    console.error("Errore caricamento appuntamento:", err);
   } finally {
    if (!cancelled) setLoading(false);
   }
  }
  load();
  return () => {
   cancelled = true;
  };
 }, [id]);

 // Se l'appuntamento è già pagato, non permettere l'accesso al carrello.
 useEffect(() => {
  if (loading || !appointment) return;
  if (appointment.pagato_at) {
   alert("Questo appuntamento risulta già pagato. Transazione già effettuata.");
   router.replace(`/agenda?date=${appointment.data}`);
  }
 }, [loading, appointment, router]);

 // Pre-populate cart with appointment service exactly once, only after the
 // cart has mounted (i.e. localStorage has been read), so refresh doesn't dup.
 useEffect(() => {
  if (!mounted) return;
  if (prepopulated) return;
  if (!appointment) return;
  if (appointment.pagato_at) return; // già pagato: skip pre-populate
  // Aspetta che le regole siano caricate (anche array vuoto va bene).
  if (pricingRules === null) return;
  if (cart.items.length > 0) {
   setPrepopulated(true);
   return;
  }
  const basePrice = Number(appointment.services?.prezzo ?? 0);
  const serviceId = appointment.services?.id ?? null;
  const when = appointmentDateTime(appointment.data, appointment.ora_inizio);
  const pricing = applyRules(basePrice, pricingRules, { when, serviceId });
  addItem({
   kind: "servizio",
   refId: serviceId,
   label: appointment.services?.nome ?? "Servizio",
   quantity: 1,
   unitPrice: pricing.adjustedPrice,
   staffId: appointment.staff_id ?? null,
   originalUnitPrice: pricing.applied ? pricing.originalPrice : null,
   appliedRuleId: pricing.applied?.id ?? null,
   appliedRuleLabel: pricing.applied ? ruleLabel(pricing.applied) : null,
   appliedDelta: pricing.applied ? pricing.delta : null,
  });
  setPrepopulated(true);
 }, [mounted, appointment, cart.items.length, prepopulated, pricingRules, addItem]);

 const filteredCategories = CATEGORIES.filter((c) =>
  c.label.toLowerCase().includes(query.trim().toLowerCase()),
 );

 function handleCategoryClick(id: CategoryCard["id"]) {
  if (id === "servizi" || id === "prodotti" || id === "buoni") {
   setModalCategory(id);
  }
 }

 function handleModalPick(picked: PickedItem) {
  if (!modalCategory) return;
  if (modalCategory === "servizi") {
   // Applica eventuale regola di pricing dinamico al servizio aggiunto
   // manualmente, usando data+ora dell'appuntamento sorgente come `when`.
   const rules = pricingRules ?? [];
   const when = appointment
    ? appointmentDateTime(appointment.data, appointment.ora_inizio)
    : new Date();
   const pricing = applyRules(picked.unitPrice, rules, {
    when,
    serviceId: picked.refId,
   });
   addItem({
    kind: "servizio",
    refId: picked.refId,
    label: picked.label,
    quantity: 1,
    unitPrice: pricing.adjustedPrice,
    staffId: appointment?.staff_id ?? null,
    originalUnitPrice: pricing.applied ? pricing.originalPrice : null,
    appliedRuleId: pricing.applied?.id ?? null,
    appliedRuleLabel: pricing.applied ? ruleLabel(pricing.applied) : null,
    appliedDelta: pricing.applied ? pricing.delta : null,
   });
  } else if (modalCategory === "prodotti") {
   addItem({
    kind: "prodotto",
    refId: picked.refId,
    label: picked.label,
    quantity: 1,
    unitPrice: picked.unitPrice,
   });
  } else if (modalCategory === "buoni") {
   addItem({
    kind: "voucher",
    refId: picked.refId,
    label: picked.label,
    quantity: 1,
    unitPrice: picked.unitPrice, // negativo — applica sconto
   });
  }
 }

 function handlePickCardRegalo(preset: CardRegaloPreset) {
  addItem({
   kind: "card_regalo",
   refId: null,
   label: preset.label,
   quantity: 1,
   unitPrice: preset.value,
   cardRegalo: { value: preset.value, label: preset.label },
  });
 }

 function handleProceed() {
  router.push(`/agenda/checkout/${id}`);
 }

 if (loading || pricingRules === null) {
  return (
   <div className="flex items-center justify-center p-12">
    <p className="text-sm text-muted-foreground">Caricamento...</p>
   </div>
  );
 }

 if (!appointment) {
  return (
   <div className="p-8 text-center">
    <p className="text-sm text-muted-foreground">Appuntamento non trovato.</p>
    <Link href="/agenda" className="mt-4 inline-block text-sm text-rose hover:underline">
     Torna all&apos;agenda
    </Link>
   </div>
  );
 }

 const clientName = appointment.clients
  ? `${appointment.clients.nome} ${appointment.clients.cognome}`.trim()
  : "Cliente sconosciuto";
 const clientPhone = appointment.clients?.telefono ?? null;

 return (
  <div className="-m-4 min-h-[100dvh] bg-background sm:-m-6 lg:-m-8">
   {/* Top bar: X + breadcrumb */}
   <div className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
    <Link
     href="/agenda"
     className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
     aria-label="Chiudi"
    >
     <X className="h-5 w-5" />
    </Link>
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
     <span className="font-medium text-foreground">Carrello</span>
     <span>›</span>
     <span>Pagamento</span>
    </nav>
   </div>

   <div className="flex flex-col lg:flex-row lg:items-start">
    {/* Main */}
    <div className="flex-1 px-4 py-6 sm:px-8 lg:px-12">
     <h1 className="mb-6 text-3xl font-bold text-foreground">
      Aggiungi al carrello
     </h1>

     {/* Search */}
     <div className="relative mb-6">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
       type="search"
       value={query}
       onChange={(e) => setQuery(e.target.value)}
       placeholder="Cerca categoria..."
       className="w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
      />
     </div>

     {/* Category grid */}
     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filteredCategories.map((cat) => {
       const Icon = cat.icon;
       return (
        <button
         key={cat.id}
         type="button"
         onClick={() => handleCategoryClick(cat.id)}
         disabled={cat.disabled}
         className={`relative flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all ${
          cat.disabled
           ? "cursor-not-allowed opacity-50"
           : "hover:border-rose/50 hover:shadow-sm"
         }`}
         title={cat.note}
        >
         <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose/10 text-rose">
          <Icon className="h-5 w-5" />
         </div>
         <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{cat.label}</p>
          {cat.note && (
           <p className="text-xs text-muted-foreground">{cat.note}</p>
          )}
         </div>
        </button>
       );
      })}
      {filteredCategories.length === 0 && (
       <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
        Nessuna categoria trovata.
       </p>
      )}
     </div>

     {/* Quick sale */}
     <QuickSaleTiles onPick={handlePickCardRegalo} />
    </div>

    {/* Sidebar */}
    <CartSidebar
     cart={cart}
     clientName={clientName}
     clientPhone={clientPhone}
     onRemove={removeItem}
     onSetQuantity={setQuantity}
     onProceed={handleProceed}
    />
   </div>

   {/* Modal */}
   <AddItemsModal
    open={modalCategory !== null}
    category={modalCategory ?? "servizi"}
    onClose={() => setModalCategory(null)}
    onPick={handleModalPick}
   />
  </div>
 );
}

export default function CarrelloPage() {
 const params = useParams();
 const id = params.id as string;
 return (
  <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento...</div>}>
   <CarrelloPageInner id={id} />
  </Suspense>
 );
}
