// @vitest-environment jsdom
/**
 * Integration tests for the checkout modal split components.
 *
 * We test:
 * 1. cartSubtotal with 2 items → correct total
 * 2. PaymentStep renders all payment method buttons
 * 3. PaymentStep confirm button is disabled when canSubmit=false (cart vuoto / no metodo)
 * 4. PaymentStep shows saldo-insufficiente error when saldoSufficiente=false
 * 5. CartStep renders category grid and empty-state message
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { cartSubtotal } from "@/lib/cart/types";
import type { CartState, CartItem } from "@/lib/cart/types";
import { PaymentStep, METODI } from "@/components/agenda/checkout/payment-step";
import { CartStep } from "@/components/agenda/checkout/cart-step";
import { CalendarDays } from "lucide-react";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    kind: "servizio",
    refId: null,
    label: "Massaggio",
    quantity: 1,
    unitPrice: 50,
    ...overrides,
  };
}

function makeCart(items: CartItem[]): CartState {
  return {
    appointmentId: "appt-1",
    clientId: "client-1",
    items,
    sconto: null,
    voucherCode: null,
    splitPayments: [],
  };
}

function noop() {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function noopSetter(_v: unknown) {}

// ---------------------------------------------------------------------------
// PaymentStep default props (all required, minimal valid config)
// ---------------------------------------------------------------------------

const basePaymentProps = {
  metodoPagamento: null,
  setMetodoPagamento: noopSetter as (m: Parameters<typeof noopSetter>[0]) => void,
  splitRows: [],
  setSplitPayments: noopSetter as (rows: Parameters<typeof noopSetter>[0]) => void,
  totale: 50,
  subtotale: 40.98,
  imposta: 9.02,
  prezzoBase: 50,
  scontoManuale: 0,
  scontoVoucher: 0,
  voucher: null,
  cartItems: [],
  fallbackServiceName: "Massaggio",
  fallbackServiceDurata: 60,
  clientName: "Mario Rossi",
  clientPhone: null,
  clientInitial: "M",
  showSconto: false,
  setShowSconto: noopSetter as (v: Parameters<typeof noopSetter>[0]) => void,
  scontoTipo: "percentuale" as const,
  setScontoTipo: noopSetter as (v: Parameters<typeof noopSetter>[0]) => void,
  scontoValore: "",
  setScontoValore: noopSetter as (v: Parameters<typeof noopSetter>[0]) => void,
  voucherCode: "",
  setVoucherCode: noopSetter as (v: Parameters<typeof noopSetter>[0]) => void,
  voucherError: "",
  voucherLoading: false,
  onApplyVoucher: noop,
  onCompleta: noop,
  saving: false,
  canSubmit: false,
  completed: false,
  walletBalance: 0,
  saldoAllocato: 0,
  saldoSufficiente: true,
};

// ---------------------------------------------------------------------------
// 1. cartSubtotal — pure function, no rendering needed
// ---------------------------------------------------------------------------

describe("cartSubtotal", () => {
  it("returns correct total for 2 items", () => {
    const cart = makeCart([
      makeItem({ id: "a", unitPrice: 30, quantity: 2 }), // 60
      makeItem({ id: "b", unitPrice: 15, quantity: 1 }), // 15
    ]);
    expect(cartSubtotal(cart)).toBe(75);
  });

  it("returns 0 for empty cart", () => {
    expect(cartSubtotal(makeCart([]))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. PaymentStep: all payment method buttons are rendered
// ---------------------------------------------------------------------------

describe("PaymentStep — metodi rendering", () => {
  it("renders all METODI buttons when walletBalance > 0", () => {
    render(
      <PaymentStep
        {...basePaymentProps}
        walletBalance={10}
      />,
    );
    // "saldo" button only visible when walletBalance > 0
    const allLabels = METODI.map((m) => m.label);
    for (const label of allLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("hides saldo button when walletBalance is 0", () => {
    render(<PaymentStep {...basePaymentProps} walletBalance={0} />);
    const saldo = METODI.find((m) => m.id === "saldo")!;
    expect(screen.queryByText(saldo.label)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. PaymentStep confirm button disabled when canSubmit=false
// ---------------------------------------------------------------------------

describe("PaymentStep — conferma button", () => {
  it("confirm button is disabled when canSubmit=false", () => {
    render(<PaymentStep {...basePaymentProps} canSubmit={false} />);
    const btn = screen.getByRole("button", { name: /conferma pagamento/i });
    expect(btn).toBeDisabled();
  });

  it("confirm button is enabled when canSubmit=true", () => {
    render(
      <PaymentStep
        {...basePaymentProps}
        canSubmit={true}
        metodoPagamento="contanti"
      />,
    );
    const btn = screen.getByRole("button", { name: /conferma pagamento/i });
    expect(btn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 4. PaymentStep — saldo insufficiente error message
// ---------------------------------------------------------------------------

describe("PaymentStep — saldo insufficiente", () => {
  it("shows error when metodo=saldo and saldoSufficiente=false", () => {
    render(
      <PaymentStep
        {...basePaymentProps}
        metodoPagamento="saldo"
        saldoAllocato={50}
        walletBalance={20}
        saldoSufficiente={false}
      />,
    );
    expect(screen.getByText(/saldo insufficiente/i)).toBeInTheDocument();
  });

  it("does not show error when saldoSufficiente=true", () => {
    render(
      <PaymentStep
        {...basePaymentProps}
        metodoPagamento="saldo"
        saldoAllocato={20}
        walletBalance={20}
        saldoSufficiente={true}
      />,
    );
    expect(screen.queryByText(/saldo insufficiente/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. CartStep — category grid renders + empty-state
// ---------------------------------------------------------------------------

describe("CartStep", () => {
  const baseCartProps = {
    query: "",
    setQuery: noopSetter as (v: string) => void,
    filteredCategories: [
      { id: "servizi" as const, label: "Servizi", icon: CalendarDays },
      { id: "prodotti" as const, label: "Prodotti", icon: CalendarDays },
    ],
    onCategoryClick: noop as (id: Parameters<typeof noop>[0]) => void,
    onPickCardRegalo: noop as (p: Parameters<typeof noop>[0]) => void,
    cart: makeCart([makeItem()]),
    clientName: "Mario Rossi",
    clientPhone: null,
    onRemove: noop as (id: string) => void,
    onSetQuantity: noop as (id: string, qty: number) => void,
    onProceed: noop,
  };

  it("renders category buttons", () => {
    render(<CartStep {...baseCartProps} />);
    expect(screen.getByText("Servizi")).toBeInTheDocument();
    expect(screen.getByText("Prodotti")).toBeInTheDocument();
  });

  it("shows empty state when no categories match search", () => {
    render(
      <CartStep
        {...baseCartProps}
        filteredCategories={[]}
      />,
    );
    expect(screen.getByText(/nessuna categoria trovata/i)).toBeInTheDocument();
  });
});
