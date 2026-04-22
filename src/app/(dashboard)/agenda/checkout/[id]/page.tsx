"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
 ArrowLeft,
 X,
 Tag,
 Banknote,
 QrCode,
 Smartphone,
 CreditCard,
 Ticket,
 SplitSquareHorizontal,
 Receipt,
 FileText,
 Landmark,
 HelpCircle,
 CheckCircle,
 type LucideIcon,
} from "lucide-react";
import { getAppointment, updateAppointmentStatus } from "@/lib/actions/appointments";
import { createCartTransaction } from "@/lib/actions/transaction-items";
import { getVoucherByCode, redeemVoucher } from "@/lib/actions/vouchers";
import { useCart } from "@/lib/cart/storage";
import { cartSubtotal, type SplitPaymentRow } from "@/lib/cart/types";
import { SplitPaymentAllocator } from "@/components/agenda/checkout/split-payment-allocator";

type AppointmentData = {
 id: string;
 stato: string;
 data: string;
 ora_inizio: string;
 clients: { id: string; nome: string; cognome: string; telefono: string | null } | null;
 services: { id: string; nome: string; durata: number; prezzo: number; categoria: string } | null;
};

type VoucherData = {
 id: string;
 codice: string;
 tipo: string;
 valore: number;
};

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

const IVA_RATE = 0.22; // IVA 22%

function CheckoutForm({ id }: { id: string }) {
 const router = useRouter();
 const [appointment, setAppointment] = useState<AppointmentData | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 const [showSconto, setShowSconto] = useState(false);
 const [scontoTipo, setScontoTipo] = useState<"percentuale" | "importo">("percentuale");
 const [scontoValore, setScontoValore] = useState("");
 const [metodoPagamento, setMetodoPagamento] = useState<MetodoId | null>(null);
 const [voucherCode, setVoucherCode] = useState("");
 const [voucher, setVoucher] = useState<VoucherData | null>(null);
 const [voucherError, setVoucherError] = useState("");
 const [voucherLoading, setVoucherLoading] = useState(false);

 const clientId = appointment?.clients?.id ?? null;
 const {
  cart,
  mounted: cartMounted,
  setSplitPayments,
  reset: resetCart,
 } = useCart(id, clientId);

 useEffect(() => {
  async function load() {
   try {
    const data = await getAppointment(id);
    setAppointment(data as unknown as AppointmentData);
   } catch (err) {
    console.error("Errore caricamento appuntamento:", err);
   } finally {
    setLoading(false);
   }
  }
  load();
 }, [id]);

 // Se il cart è vuoto (arrivato al pagamento senza passare dal carrello),
 // redirect a /carrello dopo che cart + appuntamento sono stati caricati.
 // TODO (agent B): la pagina /carrello deve esistere — se non è pronta,
 // questo redirect produce 404. In quel caso commentare questo effect.
 useEffect(() => {
  if (!cartMounted || loading) return;
  if (cart.items.length === 0) {
   router.replace(`/agenda/checkout/${id}/carrello`);
  }
 }, [cartMounted, loading, cart.items.length, id, router]);

 // Prezzo base dal cart (subtotale IVA inclusa). Se il cart è vuoto (pre-redirect),
 // fallback al servizio dell'appuntamento per evitare flash di "€ 0,00".
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
 // Scorporo IVA inversa: totale include IVA, quindi subtotale = totale / (1 + iva)
 const subtotale = totale / (1 + IVA_RATE);
 const imposta = totale - subtotale;

 // Split validation: la somma delle righe deve combaciare col totale (± 0.005 €).
 const splitRows: SplitPaymentRow[] = cart.splitPayments ?? [];
 const splitSum = Math.round(
  splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100,
 ) / 100;
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

   if (appointment) await updateAppointmentStatus(id, "completato");
   if (voucher) await redeemVoucher(voucher.id, id);

   if (result.generatedVoucherCodes.length > 0) {
    alert(
     `Card regalo generate:\n${result.generatedVoucherCodes.join("\n")}\n\nComunica i codici al cliente.`,
    );
   }

   resetCart();
   const dest = appointment?.data
    ? `/agenda?date=${appointment.data}`
    : "/agenda";
   router.push(dest);
  } catch (err) {
   console.error("Errore checkout:", err);
   alert("Errore durante il checkout. Riprova.");
  } finally {
   setSaving(false);
  }
 }

 async function handleSalvaNonPagato() {
  const dest = appointment?.data
   ? `/agenda?date=${appointment.data}`
   : "/agenda";
  router.push(dest);
 }

 if (loading || !cartMounted) {
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
 const clientInitial = clientName.charAt(0).toUpperCase();

 return (
  <div className="-m-4 min-h-screen bg-background sm:-m-6 lg:-m-8">
   {/* Top bar: close + breadcrumb */}
   <div className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
    <Link
     href="/agenda"
     className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
     aria-label="Chiudi"
    >
     <X className="h-5 w-5" />
    </Link>
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
     <Link
      href={`/agenda/checkout/${id}/carrello`}
      className="hover:text-foreground"
     >
      <span className="inline-flex items-center gap-1">
       <ArrowLeft className="h-4 w-4" />
       Carrello
      </span>
     </Link>
     <span>›</span>
     <span className="font-medium text-foreground">Pagamento</span>
    </nav>
   </div>

   <div className="flex flex-col lg:flex-row lg:gap-0">
    {/* Main: metodi + sconto + voucher */}
    <div className="flex-1 px-4 py-6 sm:px-8 lg:px-12">
     <h1 className="mb-6 text-3xl font-bold text-foreground">
      Seleziona il metodo di pagamento
     </h1>

     {/* 12 metodi grid 3x4 */}
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
         className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-all ${
          active
           ? "border-rose bg-rose/5 ring-2 ring-rose/40"
           : "border-border bg-card hover:border-muted-foreground"
         }`}
        >
         <Icon className={`h-8 w-8 ${m.iconClass}`} />
         <span className="text-sm font-medium text-foreground">{m.label}</span>
        </button>
       );
      })}
     </div>

     {/* Split payment allocator — visibile solo se metodo === split */}
     {metodoPagamento === "split" && (
      <SplitPaymentAllocator
       totale={totale}
       rows={splitRows}
       onChange={setSplitPayments}
      />
     )}

     {/* Sconto + voucher collapsible */}
     <div className="mt-8 space-y-4">
      <button
       type="button"
       onClick={() => setShowSconto((v) => !v)}
       className="flex items-center gap-2 text-sm font-medium text-rose hover:underline"
      >
       <Tag className="h-4 w-4" />
       {showSconto ? "Nascondi sconto e voucher" : "Applica sconto o voucher"}
      </button>

      {showSconto && (
       <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div>
         <label className="mb-2 block text-sm font-medium text-foreground">Sconto manuale</label>
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
         <label className="mb-2 block text-sm font-medium text-foreground">Codice voucher</label>
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
           onClick={handleApplyVoucher}
           disabled={voucherLoading || !voucherCode.trim()}
           className="rounded-lg bg-rose px-3 py-2 text-sm font-medium text-white hover:bg-rose/90 disabled:opacity-50"
          >
           {voucherLoading ? "..." : "Applica"}
          </button>
         </div>
         {voucherError && <p className="mt-1.5 text-xs text-red-500">{voucherError}</p>}
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

    {/* Right sidebar: riepilogo carrello */}
    <aside className="w-full shrink-0 border-t border-border bg-card lg:w-[360px] lg:border-l lg:border-t-0">
     <div className="flex h-full flex-col">
      <div className="flex-1 p-6">
       {/* Cliente */}
       <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
         <p className="truncate text-base font-semibold text-foreground">{clientName}</p>
         {appointment.clients?.telefono && (
          <p className="truncate text-xs text-muted-foreground">
           {appointment.clients.telefono}
          </p>
         )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose/10 text-sm font-semibold text-rose">
         {clientInitial}
        </div>
       </div>

       {/* Lista item carrello */}
       <div className="mb-6 space-y-3">
        {cart.items.length === 0 ? (
         <div className="border-l-2 border-rose/50 pl-4">
          <div className="flex items-start justify-between gap-3">
           <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
             {appointment.services?.nome ?? "Servizio"}
            </p>
            <p className="text-xs text-muted-foreground">
             {appointment.services?.durata
              ? `${appointment.services.durata}min`
              : ""}{" "}
             · Staff
            </p>
           </div>
           <p className="shrink-0 text-sm font-semibold text-foreground">
            € {prezzoBase.toFixed(2)}
           </p>
          </div>
         </div>
        ) : (
         cart.items.map((item) => {
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

       {/* Totali */}
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

      {/* Bottom actions */}
      <div className="border-t border-border p-4">
       <button
        type="button"
        onClick={handleCompleta}
        disabled={saving || !canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
       >
        <CheckCircle className="h-4 w-4" />
        {saving ? "Registrazione..." : "Conferma pagamento"}
       </button>
       <button
        type="button"
        onClick={handleSalvaNonPagato}
        disabled={saving}
        className="mt-2 w-full rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
       >
        Salva come non pagato
       </button>
      </div>
     </div>
    </aside>
   </div>
  </div>
 );
}

export default function CheckoutPage() {
 const params = useParams();
 const id = params.id as string;
 return (
  <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento...</div>}>
   <CheckoutForm id={id} />
  </Suspense>
 );
}
