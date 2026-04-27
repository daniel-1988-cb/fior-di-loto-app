"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ArrowLeft,
  CalendarDays,
  Scissors,
  Package,
  Repeat,
  Ticket,
} from "lucide-react";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { getAppointment, markAppointmentPaid } from "@/lib/actions/appointments";
import { useToast } from "@/lib/hooks/use-toast";
import { createCartTransaction } from "@/lib/actions/transaction-items";
import { getClientWalletBalance } from "@/lib/actions/client-wallet";
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
import { CartStep, type CategoryCard } from "@/components/agenda/checkout/cart-step";
import { PaymentStep, type MetodoId, type VoucherData } from "@/components/agenda/checkout/payment-step";

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

const CATEGORIES: CategoryCard[] = [
  { id: "appuntamenti", label: "Appuntamenti", icon: CalendarDays, disabled: true, note: "Prossimamente" },
  { id: "servizi", label: "Servizi", icon: Scissors },
  { id: "prodotti", label: "Prodotti", icon: Package },
  { id: "abbonamenti", label: "Abbonamenti", icon: Repeat, disabled: true, note: "Prossimamente" },
  { id: "buoni", label: "Buoni", icon: Ticket },
];

const IVA_RATE = 0.22;

export function CheckoutModal({ open, appointmentId, onClose, onCompleted }: Props) {
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
  const toast = useToast();

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
    return () => { cancelled = true; };
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

  // -------------------- Wallet balance --------------------
  const [walletBalance, setWalletBalance] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    if (!clientId) { setWalletBalance(0); return; }
    (async () => {
      try {
        const balance = await getClientWalletBalance(clientId);
        if (!cancelled) setWalletBalance(balance);
      } catch (err) {
        console.error("CheckoutModal wallet balance error:", err);
        if (!cancelled) setWalletBalance(0);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // Pre-popola con il servizio dell'appuntamento alla prima apertura
  useEffect(() => {
    if (!cartMounted || prepopulated || !appointment || appointment.pagato_at) return;
    if (cart.items.length > 0) { setPrepopulated(true); return; }
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
      toast.warning("Questo appuntamento risulta già pagato. Transazione già effettuata.");
      onClose();
    }
  }, [loading, appointment, onClose, toast]);

  // -------------------- Cart step UI state --------------------
  const [query, setQuery] = useState("");
  const [modalCategory, setModalCategory] = useState<AddItemsCategory | null>(null);

  const filteredCategories = useMemo(
    () => CATEGORIES.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );

  function handleCategoryClick(id: CategoryCard["id"]) {
    if (id === "servizi" || id === "prodotti" || id === "buoni") setModalCategory(id);
  }

  function handleModalPick(picked: PickedItem) {
    if (!modalCategory) return;
    if (modalCategory === "servizi") {
      addItem({ kind: "servizio", refId: picked.refId, label: picked.label, quantity: 1, unitPrice: picked.unitPrice, staffId: appointment?.staff_id ?? null });
    } else if (modalCategory === "prodotti") {
      addItem({ kind: "prodotto", refId: picked.refId, label: picked.label, quantity: 1, unitPrice: picked.unitPrice });
    } else if (modalCategory === "buoni") {
      addItem({ kind: "voucher", refId: picked.refId, label: picked.label, quantity: 1, unitPrice: picked.unitPrice });
    }
  }

  function handlePickCardRegalo(preset: CardRegaloPreset) {
    addItem({ kind: "card_regalo", refId: null, label: preset.label, quantity: 1, unitPrice: preset.value, cardRegalo: { value: preset.value, label: preset.label } });
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

  const prezzoBase =
    cart.items.length > 0 ? cartSubtotal(cart) : Number(appointment?.services?.prezzo || 0);

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
  const splitSum = Math.round(splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;
  const splitQuadra = splitRows.length > 0 && Math.abs(splitSum - totale) < 0.005;

  const saldoAllocato =
    metodoPagamento === "saldo"
      ? totale
      : metodoPagamento === "split"
        ? Math.round(splitRows.filter((r) => r.metodo === "saldo").reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100
        : 0;
  const saldoSufficiente = saldoAllocato <= walletBalance + 0.005;

  const canSubmit =
    !!metodoPagamento &&
    totale > 0 &&
    (metodoPagamento !== "split" || splitQuadra) &&
    saldoSufficiente;

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
    if (!metodoPagamento || (metodoPagamento === "split" && !splitQuadra) || totale <= 0) return;
    setSaving(true);
    try {
      const dataPagamento = appointment?.data ?? new Date().toISOString().slice(0, 10);
      const result = await createCartTransaction({
        cart,
        scontoImporto: scontoManuale + scontoVoucher,
        voucherId: voucher?.id,
        metodoPagamento: metodoPagamento !== "split" ? metodoPagamento : undefined,
        splitPayments: metodoPagamento === "split" ? splitRows : undefined,
        data: dataPagamento,
      });

      if (!result.ok) { toast.error(`Errore pagamento: ${result.error}`); return; }

      if (appointment) await markAppointmentPaid(appointmentId);
      if (voucher) await redeemVoucher(voucher.id, appointmentId);

      setCompleted(true);

      if (result.generatedVoucherCodes.length > 0) {
        const codes = result.generatedVoucherCodes.join(", ");
        toast.success(`Transazione effettuata. Card regalo: ${codes}. Comunica i codici al cliente.`, { duration: 12000 });
      } else {
        toast.success("Transazione effettuata con successo.");
      }

      resetCart();
      onCompleted?.();
      onClose();
    } catch (err) {
      console.error("Errore checkout:", err);
      toast.error("Errore durante il checkout. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------- Escape + scroll lock --------------------
  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [saving, onClose]);

  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap({ containerRef: panelRef, active: modalCategory === null, onEscape: handleClose });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // -------------------- Render --------------------
  const clientName = appointment?.clients
    ? `${appointment.clients.nome} ${appointment.clients.cognome}`.trim()
    : "Cliente sconosciuto";
  const clientPhone = appointment?.clients?.telefono ?? null;
  const clientInitial = (clientName || "?").charAt(0).toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        aria-label="Chiudi checkout"
        onClick={handleClose}
        className="absolute inset-0 bg-black/50"
      />

      <div ref={panelRef} className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
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
            walletBalance={walletBalance}
            saldoAllocato={saldoAllocato}
            saldoSufficiente={saldoSufficiente}
          />
        )}
      </div>

      {/* Nested add-items modal. Escape gestito dal suo hook interno. */}
      <AddItemsModal
        open={modalCategory !== null}
        category={modalCategory ?? "servizi"}
        onClose={() => setModalCategory(null)}
        onPick={handleModalPick}
      />
    </div>
  );
}
