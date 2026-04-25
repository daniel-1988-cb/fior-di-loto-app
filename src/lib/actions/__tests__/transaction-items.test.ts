/**
 * Unit tests for `createCartTransaction`.
 *
 * We mock the Supabase admin client (`@/lib/supabase/admin`) with a
 * minimal in-memory fake that records every insert/select it receives.
 * The goal is to assert the *shape* of what lands in the DB, not the DB
 * itself — Supabase is tested elsewhere.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartState } from "@/lib/cart/types";

// Valid UUIDs used by the fixtures. Must satisfy isValidUUID in validate.ts.
const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_ID = "33333333-3333-4333-8333-333333333333";
const STAFF_ID = "44444444-4444-4444-8444-444444444444";
const NEW_TX_ID = "55555555-5555-4555-8555-555555555555";
const NEW_VOUCHER_ID = "66666666-6666-4666-8666-666666666666";

type InsertCall = { table: string; payload: unknown };

/**
 * Build a Supabase query-builder fake scoped to a single "table.insert.select.single"
 * / "table.insert.insert" call chain. The real client returns a chainable thenable;
 * we approximate just the chains the action uses.
 */
function makeFake() {
  const calls: InsertCall[] = [];
  /** Queue of pre-programmed responses for `.maybeSingle()` / `.single()` / bare awaits. */
  const responses = {
    voucherLookup: { data: null as unknown, error: null as unknown }, // for code-collision check
    transactionInsert: {
      data: { id: NEW_TX_ID },
      error: null as unknown,
    },
    voucherInsert: {
      data: { id: NEW_VOUCHER_ID, codice: "CR-ABCDE" },
      error: null as unknown,
    },
    transactionItemsInsert: { data: null as unknown, error: null as unknown },
    clientSelect: {
      data: { totale_speso: "0", totale_visite: 0 },
      error: null as unknown,
    },
    clientUpdate: { data: null as unknown, error: null as unknown },
  };

  // Builder returned by supabase.from(table). Chainable and stateful on
  // the "current op" — insert vs select vs update vs delete.
  function builder(table: string) {
    const state: { op?: "insert" | "select" | "update" | "delete"; payload?: unknown } = {};
    const b: Record<string, unknown> = {};

    b.insert = (payload: unknown) => {
      state.op = "insert";
      state.payload = payload;
      calls.push({ table, payload });
      return b;
    };
    b.select = (_cols?: string) => {
      // select chain used after insert returns single row; or to look up existing rows
      if (state.op === undefined) state.op = "select";
      return b;
    };
    b.update = (payload: unknown) => {
      state.op = "update";
      state.payload = payload;
      calls.push({ table: `${table}.update`, payload });
      return b;
    };
    b.delete = () => {
      state.op = "delete";
      calls.push({ table: `${table}.delete`, payload: null });
      return b;
    };
    b.eq = () => b;
    b.maybeSingle = async () => {
      if (table === "vouchers" && state.op === "select") {
        return responses.voucherLookup;
      }
      return { data: null, error: null };
    };
    b.single = async () => {
      if (table === "transactions" && state.op === "insert") return responses.transactionInsert;
      if (table === "vouchers" && state.op === "insert") return responses.voucherInsert;
      if (table === "clients" && state.op === "select") return responses.clientSelect;
      return { data: null, error: null };
    };
    // `await supabase.from("transaction_items").insert(...)` with no chain
    // is handled by making the builder thenable after insert.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b as any).then = (onFulfilled: (v: unknown) => unknown) => {
      if (table === "transaction_items" && state.op === "insert") {
        return Promise.resolve(responses.transactionItemsInsert).then(onFulfilled);
      }
      if (table === "clients" && state.op === "update") {
        return Promise.resolve(responses.clientUpdate).then(onFulfilled);
      }
      if (state.op === "delete") {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      }
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    };
    return b;
  }

  const client = {
    from: (table: string) => builder(table),
  };

  return { client, calls, responses };
}

// Install the mock BEFORE importing the action under test.
const fake = makeFake();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.client,
}));

// Mock client-wallet: createCartTransaction usa getClientWalletBalance per
// la pre-validazione del saldo, e addWalletTransaction per scalarlo.
const walletMock = {
  /** balance corrente — i singoli test possono sovrascriverlo */
  balance: 0,
  /** se true, addWalletTransaction throwa */
  failOnAdd: false,
  /** registra le chiamate ad addWalletTransaction */
  addCalls: [] as Array<Record<string, unknown>>,
};
vi.mock("@/lib/actions/client-wallet", () => ({
  getClientWalletBalance: vi.fn(async () => walletMock.balance),
  addWalletTransaction: vi.fn(async (input: Record<string, unknown>) => {
    walletMock.addCalls.push(input);
    if (walletMock.failOnAdd) {
      throw new Error("Saldo insufficiente");
    }
    return { id: "wallet-tx-id", ...input };
  }),
}));

// Now load the action.
import { createCartTransaction } from "@/lib/actions/transaction-items";

// Reset calls between tests.
beforeEach(() => {
  fake.calls.length = 0;
  walletMock.balance = 0;
  walletMock.failOnAdd = false;
  walletMock.addCalls.length = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

function baseCart(overrides: Partial<CartState> = {}): CartState {
  return {
    appointmentId: null,
    clientId: CLIENT_ID,
    items: [],
    sconto: null,
    voucherCode: null,
    splitPayments: [],
    ...overrides,
  };
}

// --------------------------------------------
// Tests
// --------------------------------------------

describe("createCartTransaction — validation", () => {
  it("rejects empty cart", async () => {
    const res = await createCartTransaction({
      cart: baseCart({ items: [] }),
      metodoPagamento: "contanti",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/vuoto/i);
  });

  it("rejects when neither metodoPagamento nor splitPayments provided", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/metodo/i);
  });

  it("rejects invalid metodo", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
      metodoPagamento: "bitcoin",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/metodo/i);
  });

  it("rejects when split sum does not match total", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
      splitPayments: [
        { metodo: "contanti", amount: 20 },
        { metodo: "carta", amount: 10 }, // tot 30, cart is 40
      ],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/somma/i);
  });
});

describe("createCartTransaction — happy path", () => {
  it("creates 1 transaction + 2 items for a 2-item cart", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia accompagnata",
            quantity: 1,
            unitPrice: 50,
            staffId: STAFF_ID,
          },
          {
            id: "b",
            kind: "prodotto",
            refId: PRODUCT_ID,
            label: "Crema Rinascita",
            quantity: 2,
            unitPrice: 25,
          },
        ],
      }),
      metodoPagamento: "carta",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.transactionId).toBe(NEW_TX_ID);
    expect(res.generatedVoucherCodes).toEqual([]);

    // Expect 1 insert on transactions + 1 insert on transaction_items (batch).
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    expect(txInsert).toBeDefined();
    const txPayload = txInsert!.payload as Record<string, unknown>;
    expect(txPayload.tipo).toBe("entrata");
    expect(txPayload.categoria).toBe("misto");
    expect(txPayload.metodo_pagamento).toBe("carta");
    // 50 + 25*2 = 100
    expect(Number(txPayload.importo)).toBeCloseTo(100);

    const itemsInsert = fake.calls.find((c) => c.table === "transaction_items");
    expect(itemsInsert).toBeDefined();
    const rows = itemsInsert!.payload as unknown[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);
  });

  it("creates a voucher for a card_regalo item and returns its code", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "g",
            kind: "card_regalo",
            refId: null,
            label: "CARD REGALO SILVER",
            quantity: 1,
            unitPrice: 100,
            cardRegalo: { value: 100, label: "CARD REGALO SILVER 100" },
          },
        ],
      }),
      metodoPagamento: "contanti",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.generatedVoucherCodes).toEqual(["CR-ABCDE"]);

    // transactions.categoria normalizes card_regalo → "voucher"
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    const txPayload = txInsert!.payload as Record<string, unknown>;
    expect(txPayload.categoria).toBe("voucher");

    // the items insert includes the generated_voucher_id link
    const itemsInsert = fake.calls.find((c) => c.table === "transaction_items");
    const rows = itemsInsert!.payload as Array<Record<string, unknown>>;
    expect(rows[0].generated_voucher_id).toBe(NEW_VOUCHER_ID);
    expect(rows[0].kind).toBe("card_regalo");
  });

  it("split payments forces metodo=split and embeds detail in descrizione", async () => {
    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Massaggio",
            quantity: 1,
            unitPrice: 60,
          },
        ],
      }),
      splitPayments: [
        { metodo: "contanti", amount: 30 },
        { metodo: "carta", amount: 30 },
      ],
    });

    expect(res.ok).toBe(true);
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    const txPayload = txInsert!.payload as Record<string, unknown>;
    expect(txPayload.metodo_pagamento).toBe("split");
    // descrizione is sanitizeString'd — quotes become HTML entities.
    // Just check the split marker is present.
    expect(String(txPayload.descrizione)).toContain("split=");
  });
});

// --------------------------------------------
// Saldo (wallet) — singolo + split + insufficienza
// --------------------------------------------

describe("createCartTransaction — saldo (wallet)", () => {
  it("scala dal portafoglio quando metodo singolo è 'saldo' e saldo è sufficiente", async () => {
    walletMock.balance = 100; // saldo cliente

    const res = await createCartTransaction({
      cart: baseCart({
        appointmentId: null,
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
      metodoPagamento: "saldo",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.transactionId).toBe(NEW_TX_ID);

    // Verifica: transaction creata con metodo_pagamento="saldo"
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    const txPayload = txInsert!.payload as Record<string, unknown>;
    expect(txPayload.metodo_pagamento).toBe("saldo");
    expect(Number(txPayload.importo)).toBeCloseTo(40);

    // Verifica: addWalletTransaction chiamato con tipo=utilizzo, importo=40,
    // transactionId linkato.
    expect(walletMock.addCalls).toHaveLength(1);
    const walletCall = walletMock.addCalls[0];
    expect(walletCall.tipo).toBe("utilizzo");
    expect(walletCall.importo).toBe(40);
    expect(walletCall.clientId).toBe(CLIENT_ID);
    expect(walletCall.transactionId).toBe(NEW_TX_ID);
    expect(String(walletCall.descrizione)).toMatch(/checkout/i);

    // Verifica: nessuna delete (no rollback)
    const deleteCalls = fake.calls.filter((c) => c.table.endsWith(".delete"));
    expect(deleteCalls).toHaveLength(0);
  });

  it("rifiuta saldo singolo se saldo cliente è insufficiente (no transaction creata)", async () => {
    walletMock.balance = 10; // saldo basso

    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Massaggio",
            quantity: 1,
            unitPrice: 50,
          },
        ],
      }),
      metodoPagamento: "saldo",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/saldo insufficiente/i);

    // Verifica: NESSUNA transaction creata e nessuna chiamata al wallet
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    expect(txInsert).toBeUndefined();
    expect(walletMock.addCalls).toHaveLength(0);
  });

  it("rifiuta saldo se cart.clientId è null", async () => {
    walletMock.balance = 100;

    const res = await createCartTransaction({
      cart: baseCart({
        clientId: null,
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Massaggio",
            quantity: 1,
            unitPrice: 30,
          },
        ],
      }),
      metodoPagamento: "saldo",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/cliente obbligatorio/i);
    // Nessuna transaction creata
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    expect(txInsert).toBeUndefined();
  });

  it("split misto saldo+carta: scala solo la quota saldo, transaction metodo=split", async () => {
    walletMock.balance = 30;

    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Trattamento Rinascita",
            quantity: 1,
            unitPrice: 80,
          },
        ],
      }),
      splitPayments: [
        { metodo: "saldo", amount: 20 },
        { metodo: "carta", amount: 60 },
      ],
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // Transaction salvata come split
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    const txPayload = txInsert!.payload as Record<string, unknown>;
    expect(txPayload.metodo_pagamento).toBe("split");

    // Wallet scalato SOLO della quota saldo (20)
    expect(walletMock.addCalls).toHaveLength(1);
    expect(walletMock.addCalls[0].importo).toBe(20);
    expect(walletMock.addCalls[0].tipo).toBe("utilizzo");
    expect(walletMock.addCalls[0].transactionId).toBe(NEW_TX_ID);
  });

  it("split con saldo insufficiente: rifiuta, no transaction, no wallet call", async () => {
    walletMock.balance = 5;

    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Massaggio",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
      splitPayments: [
        { metodo: "saldo", amount: 20 },
        { metodo: "carta", amount: 20 },
      ],
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/saldo insufficiente/i);
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    expect(txInsert).toBeUndefined();
    expect(walletMock.addCalls).toHaveLength(0);
  });

  it("rollback: se addWalletTransaction throwa dopo creazione, cancella la transaction", async () => {
    walletMock.balance = 200;
    walletMock.failOnAdd = true; // forza fallimento del wallet

    const res = await createCartTransaction({
      cart: baseCart({
        items: [
          {
            id: "a",
            kind: "servizio",
            refId: SERVICE_ID,
            label: "Pressoterapia",
            quantity: 1,
            unitPrice: 40,
          },
        ],
      }),
      metodoPagamento: "saldo",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/scalamento saldo/i);

    // Verifica: transaction è stata creata (insert) ma poi cancellata (delete)
    const txInsert = fake.calls.find((c) => c.table === "transactions");
    expect(txInsert).toBeDefined();
    const deleteCalls = fake.calls.filter((c) =>
      c.table.endsWith(".delete"),
    );
    // Mi aspetto due delete: transaction_items + transactions
    expect(deleteCalls.length).toBeGreaterThanOrEqual(2);
    const tables = deleteCalls.map((c) => c.table);
    expect(tables).toContain("transactions.delete");
    expect(tables).toContain("transaction_items.delete");
  });
});
