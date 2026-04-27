"use client";

import {
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
  Wallet,
  Tag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { SplitPaymentAllocator } from "@/components/agenda/checkout/split-payment-allocator";
import { type SplitPaymentRow } from "@/lib/cart/types";
import { type useCart } from "@/lib/cart/storage";

export type MetodoId =
  | "contanti"
  | "carta"
  | "bonifico"
  | "satispay"
  | "paypal"
  | "buono"
  | "saldo"
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

export const METODI: MetodoCard[] = [
  { id: "self_service", label: "Pagamento self service", icon: Smartphone, iconClass: "text-emerald-500" },
  { id: "qr", label: "Codice QR", icon: QrCode, iconClass: "text-emerald-500" },
  { id: "contanti", label: "Contanti", icon: Banknote, iconClass: "text-emerald-500" },
  { id: "buono", label: "Buono", icon: Ticket, iconClass: "text-emerald-500" },
  { id: "saldo", label: "Saldo cliente", icon: Wallet, iconClass: "text-emerald-500" },
  { id: "split", label: "Dividi il pagamento", icon: SplitSquareHorizontal, iconClass: "text-rose" },
  { id: "carta", label: "Carta di Credito", icon: CreditCard, iconClass: "text-rose" },
  { id: "paypal", label: "PayPal", icon: CreditCard, iconClass: "text-rose" },
  { id: "bonifico", label: "Bonifico", icon: Landmark, iconClass: "text-rose" },
  { id: "finanziaria", label: "Finanziaria", icon: Landmark, iconClass: "text-rose" },
  { id: "assegno", label: "Assegno", icon: Receipt, iconClass: "text-rose" },
  { id: "fattura", label: "Fattura - no scontrino", icon: FileText, iconClass: "text-rose" },
  { id: "altro", label: "Altro", icon: HelpCircle, iconClass: "text-rose" },
];

export type VoucherData = {
  id: string;
  codice: string;
  tipo: string;
  valore: number;
  data_scadenza?: string | null;
};

export type PaymentStepProps = {
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
  walletBalance: number;
  saldoAllocato: number;
  saldoSufficiente: boolean;
};

export function PaymentStep({
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
  walletBalance,
  saldoAllocato,
  saldoSufficiente,
}: PaymentStepProps) {
  // Filtra il bottone "saldo" se il cliente non ha saldo disponibile.
  const visibleMetodi = METODI.filter(
    (m) => m.id !== "saldo" || walletBalance > 0,
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Main: metodi */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        <h1 className="mb-5 text-2xl font-bold text-foreground">
          Seleziona il metodo di pagamento
        </h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleMetodi.map((m) => {
            const Icon = m.icon;
            const active = metodoPagamento === m.id;
            const isSaldo = m.id === "saldo";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetodoPagamento(m.id)}
                aria-pressed={active}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  active
                    ? "border-rose bg-rose/5 ring-2 ring-rose/40"
                    : "border-border bg-background hover:border-muted-foreground"
                }`}
              >
                <Icon className={`h-7 w-7 ${m.iconClass}`} />
                <span className="text-xs font-medium text-foreground">{m.label}</span>
                {isSaldo && (
                  <span className="mt-0.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Saldo: &euro; {walletBalance.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {metodoPagamento === "saldo" && !saldoSufficiente && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            Saldo insufficiente: serve &euro; {saldoAllocato.toFixed(2)} (saldo &euro; {walletBalance.toFixed(2)})
          </p>
        )}

        {metodoPagamento === "split" && (
          <>
            <SplitPaymentAllocator
              totale={totale}
              rows={splitRows}
              onChange={setSplitPayments}
              walletBalance={walletBalance}
            />
            {!saldoSufficiente && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                Saldo insufficiente: allocato &euro; {saldoAllocato.toFixed(2)} (saldo &euro; {walletBalance.toFixed(2)})
              </p>
            )}
          </>
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
                    &euro; Fisso
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
                    {voucher.codice} applicato (-&euro;{scontoVoucher.toFixed(2)})
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
                        {fallbackServiceDurata ? `${fallbackServiceDurata}min` : ""} &middot; Staff
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      &euro; {prezzoBase.toFixed(2)}
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
                          &euro; {lineTotal.toFixed(2)}
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
                <dd>&euro; {subtotale.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Imposta</dt>
                <dd>&euro; {imposta.toFixed(2)}</dd>
              </div>
              {scontoManuale > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Sconto</dt>
                  <dd>-&euro; {scontoManuale.toFixed(2)}</dd>
                </div>
              )}
              {scontoVoucher > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Voucher {voucher?.codice}</dt>
                  <dd>-&euro; {scontoVoucher.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <dt>Totale</dt>
                <dd>&euro; {totale.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-sm font-semibold text-foreground">
                <dt>Da pagare</dt>
                <dd>&euro; {totale.toFixed(2)}</dd>
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
