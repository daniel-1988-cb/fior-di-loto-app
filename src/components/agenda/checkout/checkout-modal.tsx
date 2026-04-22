"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
 X,
 Search,
 ArrowLeft,
 CalendarDays,
 Scissors,
 Package,
 Repeat,
 Ticket,
 Tag,
 Banknote,
 QrCode,
 Smartphone,
 CreditCard,
 SplitSquareHorizontal,
 Receipt,
 FileText,
 Landmark,
 HelpCircle,
 CheckCircle,
 type LucideIcon,
} from "lucide-react";
import { getAppointment, markAppointmentPaid } from "@/lib/actions/appointments";
import { createCartTransaction } from "@/lib/actions/transaction-items";
import { getVoucherByCode, redeemVoucher } from "@/lib/actions/vouchers";
import { useCart } from "@/lib/cart/storage";
import {
 cartSubtotal,
 type CardRegaloPreset,
 type SplitPaymentRow,
} from "@/lib/cart/types";
import {
 AddItemsModal,
 type AddItemsCategory,
 type PickedItem,
} from "@/components/agenda/checkout/add-items-modal";
import { CartSidebar } from "@/components/agenda/checkout/cart-sidebar";
import { QuickSaleTiles } from "@/components/agenda/checkout/quick-sale-tiles";
import { SplitPaymentAllocator } from "@/components/agenda/checkout/split-payment-allocator";

/**
 * Checkout modal a 2-step (Carrello -> Pagamento), mostrato sopra l'agenda
 * senza cambiare pagina.
 *
 * Riusa i componenti esistenti (QuickSaleTiles, AddItemsModal, CartSidebar,
 * SplitPaymentAllocator) e la stessa logica delle pagine full-screen
 * /agenda/checkout/[id]/carrello e /agenda/checkout/[id] — le quali
 * restano vive e funzionanti per bookmark/deep-link.
 *
 * A pagamento concluso: alert "Transazione effettuata ✓" -> onCompleted()
 * -> onClose(). L'utente resta sull'agenda e il chiamante fa router.refresh()
 * per ridipingere l'appuntamento come "pagato" (grigio).
 */

type Props = {
 open: boolean;
 appointmentId: string | null;
 onClose: () => void;
 onCompleted?: () => void;
};

type Step = "cart" | "payment";

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

type VoucherData = {
 id: string;
 codice: string;
 tipo: string;
 valore: number;
 data_scadenza?: string | null;
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

type MetodoId =
 | "contanti"
 | "carta"
 | "bonifico"
 | "satispay"
 | "paypal"
 | "buono"
 | "qr"
 | "self_service"
 | "split"
 | "assegno"
 | "fattura"
 | "finanziaria"
 | "altro";

type MetodoCard = {
 id: MetodoId;
 label: string;
 icon: LucideIcon;
 iconClass: string;
};

const METODI: MetodoCard[] = [
 { id: "self_service", label: "Pagamento self service", icon: Smartphone, iconClass: "text-emerald-500" },
 { id: "qr", label: "Codice QR", icon: QrCode, iconClass: "text-emerald-500" },
 { id: "contanti", label: "Contanti", icon: Banknote, iconClass: "text-emerald-500" },
 { id: "buono", label: "Buono", icon: Ticket, iconClass: "text-emerald-500" },
 { id: "split", label: "Dividi il pagamento", icon: SplitSquareHorizontal, iconClass: "text-rose" },
 { id: "carta", label: "Carta di Credito", icon: CreditCard, iconClass: "text-rose" },
 { id: "paypal", label: "PayPal", icon: CreditCard, iconClass: "text-rose" },
 { id: "bonifico", label: "Bonifico", icon: Landmark, iconClass: "text-rose" },
 { id: "finanziaria", label: "Finanziaria", icon: Landmark, iconClass: "text-rose" },
 { id: "assegno", label: "Assegno", icon: Receipt, iconClass: "text-rose" },
 { id: "fattura", label: "Fattura - no scontrino", icon: FileText, iconClass: "text-rose" },
 { id: "altro", label: "Altro", icon: HelpCircle, iconClass: "text-rose" },
];

const IVA_RATE = 0.22;

export function CheckoutModal({ open, appointmentId, onClose, onCompleted }: Props) {
 // Rendiamo il modale solo con un appointmentId valido. Il wrapper interno
 // (CheckoutModalInner) è montato dinamicamente — riceve la chiave appt
 // id per resettare stato (cart, step, ecc.) ogni volta che cambiamo appt.
 if (!open || !appointmentId) return null;
 return (
  <CheckoutModalInner
   key={appointmentId}
   appointmentId={appointmentId}
   onClose={onClose}
   onCompleted={onCompleted}
  />
 );
}

function CheckoutModalInner({
 appointmentId,
 onClose,
 onCompleted,
}: {
 appointmentId: string;
 onClose: () => void;
 onCompleted?: () => void;
}) {
 const [step, setStep] = useState<Step>("cart");

 // -------------------- Appointment load --------------------
 const [appointment, setAppointment] = useState<AppointmentData | null>(null);
 const [loading, setLoading] = useState(true);
 const [prepopulated, setPrepopulated] = useState(false);

 useEffect(() => {
  let cancelled = false;
  async function load() {
   try {
    const data = await getAppointment(appointmentId);
    if (!cancelled) setAppointment(data as unknown as AppointmentData);
   } catch (err) {
    console.error("CheckoutModal load error:", err);
   } finally {
    if (!cancelled) setLoading(false);
   }
  }
  load();
  return () => {
   cancelled = true;
  };
 }, [appointmentId]);

 // -------------------- Cart --------------------
 const clientId = appointment?.clients?.id ?? null;
 const {
  cart,
  mounted: cartMounted,
  addItem,
  removeItem,
  setQuantity,
  setSplitPayments,
  reset: resetCart,
 } = useCart(appointmentId, clientId);

 // Pre-popola con il servizio dell'appuntamento alla prima apertura
 useEffect(() => {
  if (!cartMounted) return;
  if (prepopulated) return;
  if (!appointment) return;
  if (appointment.pagato_at) return;
  if (cart.items.length > 0) {
   setPrepopulated(true);
   return;
  }
  addItem({
   kind: "servizio",
   refId: appointment.services?.id ?? null,
   label: appointment.services?.nome ?? "Servizio",
   quantity: 1,
   unitPrice: Number(appointment.services?.prezzo ?? 0),
   staffId: appointment.staff_id ?? null,
  });
  setPrepopulated(true);
 }, [cartMounted, appointment, cart.items.length, prepopulated, addItem]);

 // Se l'appuntamento è già pagato, non permettere il checkout.
 useEffect(() => {
  if (loading || !appointment) return;
  if (appointment.pagato_at) {
   alert("Questo appuntamento risulta già pagato. Transazione già effettuata.");
   onClose();
  }
 }, [loading, appointment, onClose]);

 // -------------------- Cart step UI state --------------------
 const [query, setQuery] = useState("");
 const [modalCategory, setModalCategory] = useState<AddItemsCategory | null>(null);

 const filteredCategories = useMemo(
  () =>
   CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
   ),
  [query],
 );

 function handleCategoryClick(id: CategoryCard["id"]) {
  if (id === "servizi" || id === "prodotti" || id === "buoni") {
   setModalCategory(id);
  }
 }

 function handleModalPick(picked: PickedItem) {
  if (!modalCategory) return;
  if (modalCategory === "servizi") {
   addItem({
    kind: "servizio",
    refId: picked.refId,
    label: picked.label,
    quantity: 1,
    unitPrice: picked.unitPrice,
    staffId: appointment?.staff_id ?? null,
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
    unitPrice: picked.unitPrice,
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

 // -------------------- Payment step UI state --------------------
 const [showSconto, setShowSconto] = useState(false);
 const [scontoTipo, setScontoTipo] = useState<"percentuale" | "importo">("percentuale");
 const [scontoValore, setScontoValore] = useState("");
 const [metodoPagamento, setMetodoPagamento] = useState<MetodoId | null>(null);
 const [voucherCode, setVoucherCode] = useState("");
 const [voucher, setVoucher] = useState<VoucherData | null>(null);
 const [voucherError, setVoucherError] = useState("");
 const [voucherLoading, setVoucherLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [completed, setCompleted] = useState(false);

 // Prezzo base dal cart (IVA inclusa). Fallback al servizio se cart vuoto.
 const prezzoBase =
  cart.items.length > 0
   ? cartSubtotal(cart)
   : Number(appointment?.services?.prezzo || 0);

 function calcSconto(): number {
  const val = parseFloat(scontoValore) || 0;
  if (scontoTipo === "percentuale") return Math.min((prezzoBase * val) / 100, prezzoBase);
  return Math.min(val, prezzoBase);
 }

 function calcVoucherSconto(): number {
  if (!voucher) return 0;
  if (voucher.tipo === "importo") return Math.min(Number(voucher.valore), prezzoBase);
  if (voucher.tipo === "servizio" || voucher.tipo === "prodotto") return prezzoBase;
  return 0;
 }

 const scontoManuale = calcSconto();
 const scontoVoucher = calcVoucherSconto();
 const totale = Math.max(prezzoBase - scontoManuale - scontoVoucher, 0);
 const subtotale = totale / (1 + IVA_RATE);
 const imposta = totale - subtotale;

 const splitRows: SplitPaymentRow[] = cart.splitPayments ?? [];
 const splitSum =
  Math.round(splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;
 const splitQuadra = splitRows.length > 0 && Math.abs(splitSum - totale) < 0.005;

 const canSubmit =
  !!metodoPagamento &&
  totale > 0 &&
  (metodoPagamento !== "split" || splitQuadra);

 async function handleApplyVoucher() {
  if (!voucherCode.trim()) return;
  setVoucherError("");
  setVoucherLoading(true);
  try {
   const found = await getVoucherByCode(voucherCode.trim());
   if (!found) {
    setVoucherError("Voucher non trovato o già utilizzato.");
    setVoucher(null);
   } else if (found.data_scadenza && new Date(found.data_scadenza) < new Date()) {
    setVoucherError("Questo voucher è scaduto.");
    setVoucher(null);
   } else {
    setVoucher(found as unknown as VoucherData);
    setVoucherError("");
   }
  } catch (err) {
   console.error(err);
   setVoucherError("Errore nella verifica del voucher.");
  } finally {
   setVoucherLoading(false);
  }
 }

 async function handleCompleta() {
  if (!metodoPagamento) return;
  if (metodoPagamento === "split" && !splitQuadra) return;
  if (totale <= 0) return;
  setSaving(true);
  try {
   const today = new Date().toISOString().slice(0, 10);
   const dataPagamento = appointment?.data ?? today;

   const result = await createCartTransaction({
    cart,
    scontoImporto: scontoManuale + scontoVoucher,
    voucherId: voucher?.id,
    metodoPagamento: metodoPagamento !== "split" ? metodoPagamento : undefined,
    splitPayments: metodoPagamento === "split" ? splitRows : undefined,
    data: dataPagamento,
   });

   if (!result.ok) {
    alert(`Errore pagamento: ${result.error}`);
    return;
   }

   if (appointment) await markAppointmentPaid(appointmentId);
   if (voucher) await redeemVoucher(voucher.id, appointmentId);

   setCompleted(true);

   const giftCodesMsg =
    result.generatedVoucherCodes.length > 0
     ? `\n\nCard regalo generate:\n${result.generatedVoucherCodes.join("\n")}\nComunica i codici al cliente.`
     : "";
   alert(`Transazione effettuata ✓${giftCodesMsg}`);

   resetCart();
   onCompleted?.();
   onClose();
  } catch (err) {
   console.error("Errore checkout:", err);
   alert("Errore durante il checkout. Riprova.");
  } finally {
   setSaving(false);
  }
 }

 // -------------------- Escape + scroll lock --------------------
 const handleClose = useCallback(() => {
  if (saving) return; // non chiudere durante una transazione
  onClose();
 }, [saving, onClose]);

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
   if (e.key !== "Escape") return;
   // Se un sotto-modale (AddItemsModal) è aperto, lasciamo che sia lui a gestirlo.
   if (modalCategory !== null) return;
   handleClose();
  };
  window.addEventListener("keydown", onKey);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
   window.removeEventListener("keydown", onKey);
   document.body.style.overflow = prevOverflow;
  };
 }, [handleClose, modalCategory]);

 // -------------------- Render --------------------
 const clientName = appointment?.clients
  ? `${appointment.clients.nome} ${appointment.clients.cognome}`.trim()
  : "Cliente sconosciuto";
 const clientPhone = appointment?.clients?.telefono ?? null;
 const clientInitial = (clientName || "?").charAt(0).toUpperCase();

 // Layout: overlay + pannello centrale ampio
 return (
  <div
   role="dialog"
   aria-modal="true"
   aria-labelledby="checkout-modal-title"
   className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
  >
   {/* Overlay click-outside */}
   <button
    type="button"
    aria-label="Chiudi checkout"
    onClick={handleClose}
    className="absolute inset-0 bg-black/50"
   />

   {/* Pannello */}
   <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
    {/* Topbar */}
    <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
     <button
      type="button"
      onClick={handleClose}
      aria-label="Chiudi"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
     >
      <X className="h-4 w-4" />
     </button>
     <nav
      id="checkout-modal-title"
      className="flex items-center gap-2 text-sm text-muted-foreground"
      aria-label="Passi checkout"
     >
      {step === "cart" ? (
       <>
        <span className="font-medium text-foreground">Carrello</span>
        <span aria-hidden="true">›</span>
        <span>Pagamento</span>
       </>
      ) : (
       <>
        <button
         type="button"
         onClick={() => setStep("cart")}
         className="inline-flex items-center gap-1 hover:text-foreground"
        >
         <ArrowLeft className="h-4 w-4" />
         Carrello
        </button>
        <span aria-hidden="true">›</span>
        <span className="font-medium text-foreground">Pagamento</span>
       </>
      )}
     </nav>
    </div>

    {/* Body */}
    {loading || !cartMounted ? (
     <div className="flex flex-1 items-center justify-center p-12">
      <p className="text-sm text-muted-foreground">Caricamento...</p>
     </div>
    ) : !appointment ? (
     <div className="flex flex-1 items-center justify-center p-12">
      <p className="text-sm text-muted-foreground">Appuntamento non trovato.</p>
     </div>
    ) : step === "cart" ? (
     <CartStep
      query={query}
      setQuery={setQuery}
      filteredCategories={filteredCategories}
      onCategoryClick={handleCategoryClick}
      onPickCardRegalo={handlePickCardRegalo}
      cart={cart}
      clientName={clientName}
      clientPhone={clientPhone}
      onRemove={removeItem}
      onSetQuantity={setQuantity}
      onProceed={() => setStep("payment")}
     />
    ) : (
     <PaymentStep
      metodoPagamento={metodoPagamento}
      setMetodoPagamento={setMetodoPagamento}
      splitRows={splitRows}
      setSplitPayments={setSplitPayments}
      totale={totale}
      subtotale={subtotale}
      imposta={imposta}
      prezzoBase={prezzoBase}
      scontoManuale={scontoManuale}
      scontoVoucher={scontoVoucher}
      voucher={voucher}
      cartItems={cart.items}
      fallbackServiceName={appointment.services?.nome ?? "Servizio"}
      fallbackServiceDurata={appointment.services?.durata ?? null}
      clientName={clientName}
      clientPhone={clientPhone}
      clientInitial={clientInitial}
      showSconto={showSconto}
      setShowSconto={setShowSconto}
      scontoTipo={scontoTipo}
      setScontoTipo={setScontoTipo}
      scontoValore={scontoValore}
      setScontoValore={setScontoValore}
      voucherCode={voucherCode}
      setVoucherCode={setVoucherCode}
      voucherError={voucherError}
      voucherLoading={voucherLoading}
      onApplyVoucher={handleApplyVoucher}
      onCompleta={handleCompleta}
      saving={saving}
      canSubmit={canSubmit}
      completed={completed}
     />
    )}
   </div>

   {/* Nested add-items modal (servizi/prodotti/buoni). Usa z-index >= 50
       e un backdrop proprio. Escape viene gestito dal suo hook interno;
       quello del modal principale è stato silenziato sopra. */}
   <AddItemsModal
    open={modalCategory !== null}
    category={modalCategory ?? "servizi"}
    onClose={() => setModalCategory(null)}
    onPick={handleModalPick}
   />
  </div>
 );
}

// ================================================================
// CART STEP
// ================================================================

type CartStepProps = {
 query: string;
 setQuery: (v: string) => void;
 filteredCategories: CategoryCard[];
 onCategoryClick: (id: CategoryCard["id"]) => void;
 onPickCardRegalo: (preset: CardRegaloPreset) => void;
 cart: ReturnType<typeof useCart>["cart"];
 clientName: string;
 clientPhone: string | null;
 onRemove: (id: string) => void;
 onSetQuantity: (id: string, qty: number) => void;
 onProceed: () => void;
};

function CartStep({
 query,
 setQuery,
 filteredCategories,
 onCategoryClick,
 onPickCardRegalo,
 cart,
 clientName,
 clientPhone,
 onRemove,
 onSetQuantity,
 onProceed,
}: CartStepProps) {
 return (
  <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
   {/* Main (categorie + quick sale) */}
   <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
    <h1 className="mb-5 text-2xl font-bold text-foreground">
     Aggiungi al carrello
    </h1>

    <div className="relative mb-5">
     <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
     <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Cerca categoria..."
      className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
     />
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {filteredCategories.map((cat) => {
      const Icon = cat.icon;
      return (
       <button
        key={cat.id}
        type="button"
        onClick={() => onCategoryClick(cat.id)}
        disabled={cat.disabled}
        className={`relative flex items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-all ${
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

    <QuickSaleTiles onPick={onPickCardRegalo} />
   </div>

   {/* Sidebar carrello */}
   <div className="shrink-0 lg:w-[360px]">
    <CartSidebar
     cart={cart}
     clientName={clientName}
     clientPhone={clientPhone}
     onRemove={onRemove}
     onSetQuantity={onSetQuantity}
     onProceed={onProceed}
    />
   </div>
  </div>
 );
}

// ================================================================
// PAYMENT STEP
// ================================================================

type PaymentStepProps = {
 metodoPagamento: MetodoId | null;
 setMetodoPagamento: (m: MetodoId) => void;
 splitRows: SplitPaymentRow[];
 setSplitPayments: (rows: SplitPaymentRow[]) => void;
 totale: number;
 subtotale: number;
 imposta: number;
 prezzoBase: number;
 scontoManuale: number;
 scontoVoucher: number;
 voucher: VoucherData | null;
 cartItems: ReturnType<typeof useCart>["cart"]["items"];
 fallbackServiceName: string;
 fallbackServiceDurata: number | null;
 clientName: string;
 clientPhone: string | null;
 clientInitial: string;
 showSconto: boolean;
 setShowSconto: (v: boolean | ((p: boolean) => boolean)) => void;
 scontoTipo: "percentuale" | "importo";
 setScontoTipo: (v: "percentuale" | "importo") => void;
 scontoValore: string;
 setScontoValore: (v: string) => void;
 voucherCode: string;
 setVoucherCode: (v: string) => void;
 voucherError: string;
 voucherLoading: boolean;
 onApplyVoucher: () => void;
 onCompleta: () => void;
 saving: boolean;
 canSubmit: boolean;
 completed: boolean;
};

function PaymentStep({
 metodoPagamento,
 setMetodoPagamento,
 splitRows,
 setSplitPayments,
 totale,
 subtotale,
 imposta,
 prezzoBase,
 scontoManuale,
 scontoVoucher,
 voucher,
 cartItems,
 fallbackServiceName,
 fallbackServiceDurata,
 clientName,
 clientPhone,
 clientInitial,
 showSconto,
 setShowSconto,
 scontoTipo,
 setScontoTipo,
 scontoValore,
 setScontoValore,
 voucherCode,
 setVoucherCode,
 voucherError,
 voucherLoading,
 onApplyVoucher,
 onCompleta,
 saving,
 canSubmit,
 completed,
}: PaymentStepProps) {
 return (
  <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
   {/* Main: metodi */}
   <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
    <h1 className="mb-5 text-2xl font-bold text-foreground">
     Seleziona il metodo di pagamento
    </h1>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
     {METODI.map((m) => {
      const Icon = m.icon;
      const active = metodoPagamento === m.id;
      return (
       <button
        key={m.id}
        type="button"
        onClick={() => setMetodoPagamento(m.id)}
        aria-pressed={active}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
         active
          ? "border-rose bg-rose/5 ring-2 ring-rose/40"
          : "border-border bg-background hover:border-muted-foreground"
        }`}
       >
        <Icon className={`h-7 w-7 ${m.iconClass}`} />
        <span className="text-xs font-medium text-foreground">{m.label}</span>
       </button>
      );
     })}
    </div>

    {metodoPagamento === "split" && (
     <SplitPaymentAllocator
      totale={totale}
      rows={splitRows}
      onChange={setSplitPayments}
     />
    )}

    <div className="mt-6 space-y-4">
     <button
      type="button"
      onClick={() => setShowSconto((v) => !v)}
      className="flex items-center gap-2 text-sm font-medium text-rose hover:underline"
     >
      <Tag className="h-4 w-4" />
      {showSconto ? "Nascondi sconto e voucher" : "Applica sconto o voucher"}
     </button>

     {showSconto && (
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-background p-5 sm:grid-cols-2">
       <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
         Sconto manuale
        </label>
        <div className="mb-2 flex gap-2">
         <button
          type="button"
          onClick={() => setScontoTipo("percentuale")}
          className={`flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors ${
           scontoTipo === "percentuale"
            ? "border-rose bg-rose text-white"
            : "border-border bg-card text-foreground hover:bg-muted"
          }`}
         >
          %
         </button>
         <button
          type="button"
          onClick={() => setScontoTipo("importo")}
          className={`flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors ${
           scontoTipo === "importo"
            ? "border-rose bg-rose text-white"
            : "border-border bg-card text-foreground hover:bg-muted"
          }`}
         >
          € Fisso
         </button>
        </div>
        <input
         type="number"
         min="0"
         step="0.01"
         value={scontoValore}
         onChange={(e) => setScontoValore(e.target.value)}
         placeholder={scontoTipo === "percentuale" ? "Es. 10 per 10%" : "Es. 5.00"}
         className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
        />
       </div>
       <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
         Codice voucher
        </label>
        <div className="flex gap-2">
         <input
          type="text"
          value={voucherCode}
          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
          placeholder="Es. FDL-A3X9"
          className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
         />
         <button
          type="button"
          onClick={onApplyVoucher}
          disabled={voucherLoading || !voucherCode.trim()}
          className="rounded-lg bg-rose px-3 py-2 text-sm font-medium text-white hover:bg-rose/90 disabled:opacity-50"
         >
          {voucherLoading ? "..." : "Applica"}
         </button>
        </div>
        {voucherError && (
         <p className="mt-1.5 text-xs text-red-500">{voucherError}</p>
        )}
        {voucher && (
         <p className="mt-1.5 text-xs text-emerald-600">
          {voucher.codice} applicato (-€{scontoVoucher.toFixed(2)})
         </p>
        )}
       </div>
      </div>
     )}
    </div>
   </div>

   {/* Right sidebar: riepilogo */}
   <aside className="w-full shrink-0 border-t border-border bg-card lg:w-[360px] lg:border-l lg:border-t-0">
    <div className="flex h-full flex-col">
     <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
       <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">
         {clientName}
        </p>
        {clientPhone && (
         <p className="truncate text-xs text-muted-foreground">{clientPhone}</p>
        )}
       </div>
       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose/10 text-sm font-semibold text-rose">
        {clientInitial}
       </div>
      </div>

      <div className="mb-5 space-y-3">
       {cartItems.length === 0 ? (
        <div className="border-l-2 border-rose/50 pl-4">
         <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
           <p className="text-sm font-medium text-foreground">
            {fallbackServiceName}
           </p>
           <p className="text-xs text-muted-foreground">
            {fallbackServiceDurata ? `${fallbackServiceDurata}min` : ""} · Staff
           </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-foreground">
           € {prezzoBase.toFixed(2)}
          </p>
         </div>
        </div>
       ) : (
        cartItems.map((item) => {
         const lineTotal = item.unitPrice * item.quantity;
         return (
          <div
           key={item.id}
           className="border-l-2 border-rose/50 pl-4"
          >
           <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
             <p className="truncate text-sm font-medium text-foreground">
              {item.label}
             </p>
             <p className="text-xs text-muted-foreground">
              {item.quantity > 1 ? `${item.quantity}× ` : ""}
              {item.kind}
             </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-foreground">
             € {lineTotal.toFixed(2)}
            </p>
           </div>
          </div>
         );
        })
       )}
      </div>

      <dl className="space-y-2 border-t border-border pt-4 text-sm">
       <div className="flex justify-between text-muted-foreground">
        <dt>Subtotale</dt>
        <dd>€ {subtotale.toFixed(2)}</dd>
       </div>
       <div className="flex justify-between text-muted-foreground">
        <dt>Imposta</dt>
        <dd>€ {imposta.toFixed(2)}</dd>
       </div>
       {scontoManuale > 0 && (
        <div className="flex justify-between text-emerald-600">
         <dt>Sconto</dt>
         <dd>-€ {scontoManuale.toFixed(2)}</dd>
        </div>
       )}
       {scontoVoucher > 0 && (
        <div className="flex justify-between text-emerald-600">
         <dt>Voucher {voucher?.codice}</dt>
         <dd>-€ {scontoVoucher.toFixed(2)}</dd>
        </div>
       )}
       <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
        <dt>Totale</dt>
        <dd>€ {totale.toFixed(2)}</dd>
       </div>
       <div className="flex justify-between text-sm font-semibold text-foreground">
        <dt>Da pagare</dt>
        <dd>€ {totale.toFixed(2)}</dd>
       </div>
      </dl>
     </div>

     <div className="border-t border-border p-4">
      <button
       type="button"
       onClick={onCompleta}
       disabled={saving || !canSubmit || completed}
       className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
       <CheckCircle className="h-4 w-4" />
       {saving ? "Registrazione..." : "Conferma pagamento"}
      </button>
     </div>
    </div>
   </aside>
  </div>
 );
}
