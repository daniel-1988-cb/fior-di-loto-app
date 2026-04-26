"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";
import type { CartState, CartItem, SplitPaymentRow } from "@/lib/cart/types";
import { addWalletTransaction, getClientWalletBalance } from "@/lib/actions/client-wallet";

export type RefundTransactionToWalletResult =
  | { ok: true; refunded: number }
  | { ok: false; error: string };

/**
 * Rimborsa al wallet del cliente l'importo che era stato scalato per pagare
 * la `transaction` con id = `transactionId`.
 *
 * Idempotente: se non esiste alcun "utilizzo" wallet linkato a quella tx,
 * o se un "rimborso" è già stato emesso per essa, ritorna `{ok:true, refunded:0}`.
 *
 * Non lancia mai: gli errori del DB diventano `{ok:false, error}` così il
 * chiamante può loggare un warning senza bloccare l'annullamento.
 */
export async function refundTransactionToWallet(
  transactionId: string,
): Promise<RefundTransactionToWalletResult> {
  if (!isValidUUID(transactionId)) {
    return { ok: false, error: "ID transazione non valido" };
  }

  const supabase = createAdminClient();

  // 1) Cerca la riga di "utilizzo" wallet linkata alla transaction.
  //    Se non c'è, la transaction non è stata pagata col saldo: no-op.
  const { data: utilizzo, error: e1 } = await supabase
    .from("client_wallet_transactions")
    .select("id, client_id, importo, appointment_id")
    .eq("transaction_id", transactionId)
    .eq("tipo", "utilizzo")
    .maybeSingle();

  if (e1) {
    return { ok: false, error: e1.message };
  }
  if (!utilizzo) {
    return { ok: true, refunded: 0 };
  }

  const row = utilizzo as {
    id: string;
    client_id: string;
    importo: number | string;
    appointment_id: string | null;
  };

  // 2) Idempotenza: se esiste già un "rimborso" per la stessa tx, no-op.
  const { data: existingRefund, error: e2 } = await supabase
    .from("client_wallet_transactions")
    .select("id")
    .eq("transaction_id", transactionId)
    .eq("tipo", "rimborso")
    .maybeSingle();

  if (e2) {
    return { ok: false, error: e2.message };
  }
  if (existingRefund) {
    return { ok: true, refunded: 0 };
  }

  // 3) Crea la contro-riga "rimborso" col valore assoluto dell'utilizzo.
  const importoOriginale = Math.abs(Number(row.importo) || 0);
  if (importoOriginale <= 0) {
    return { ok: true, refunded: 0 };
  }

  try {
    await addWalletTransaction({
      clientId: row.client_id,
      tipo: "rimborso",
      importo: importoOriginale,
      descrizione: `Rimborso automatico annullamento tx #${transactionId.slice(0, 8)}`,
      appointmentId: row.appointment_id,
      transactionId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore wallet";
    return { ok: false, error: msg };
  }

  return { ok: true, refunded: importoOriginale };
}

// Deve stare allineato con VALID_METODI in transactions.ts.
const VALID_METODI = [
  "contanti",
  "carta",
  "bonifico",
  "satispay",
  "paypal",
  "buono",
  "saldo",
  "qr",
  "self_service",
  "split",
  "assegno",
  "fattura",
  "finanziaria",
  "altro",
] as const;

const VALID_KINDS = ["servizio", "prodotto", "abbonamento", "voucher", "card_regalo"] as const;

function isValidMetodo(m: string): boolean {
  return (VALID_METODI as readonly string[]).includes(m);
}

function isValidKind(k: string): boolean {
  return (VALID_KINDS as readonly string[]).includes(k);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "CR-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// TYPES
// ============================================

export type CreateCartTransactionInput = {
  cart: CartState;
  /** Importo sconto in € — già calcolato lato client da cart.sconto. */
  scontoImporto?: number;
  /** Id voucher già esistente applicato come sconto (NON la card in vendita). */
  voucherId?: string | null;
  /** Singolo metodo di pagamento (alternativo a splitPayments). */
  metodoPagamento?: string;
  /** Split payments: se presente, metodoPagamento viene forzato a "split". */
  splitPayments?: SplitPaymentRow[];
  /** YYYY-MM-DD — default: oggi. */
  data?: string;
};

export type CreateCartTransactionResult =
  | { ok: true; transactionId: string; generatedVoucherCodes: string[] }
  | { ok: false; error: string };

// ============================================
// HELPERS
// ============================================

/**
 * Derive category for the single transactions row from the cart composition.
 *  - tutti i kind uguali -> usa quel kind
 *  - misto -> "misto"
 *  - cart vuoto -> "servizio" (già validato prima)
 */
function deriveCategoria(items: CartItem[]): string {
  if (items.length === 0) return "servizio";
  const kinds = new Set(items.map((i) => i.kind));
  if (kinds.size === 1) {
    const only = [...kinds][0];
    // normalizza i kind cart → categoria transaction.
    // Lo schema categoria di transactions è libera (varchar 50), ma i valori
    // finora sono: servizio, prodotto, abbonamento, spesa_fissa, fornitore.
    // card_regalo → "voucher" (coerente col concetto: vendita buono).
    if (only === "card_regalo") return "voucher";
    return only;
  }
  return "misto";
}

function deriveDescrizione(items: CartItem[], split?: SplitPaymentRow[]): string {
  // se split presente, salviamo il dettaglio come JSON breve *in fondo* alla
  // descrizione. Oggi `transactions` non ha una colonna dedicata, e la task
  // lo consente esplicitamente (vedi istruzioni agent).
  const base =
    items.length === 1
      ? items[0].label
      : `Checkout ${items.length} articoli`;
  if (split && split.length > 0) {
    const minimal = split.map((s) => ({ metodo: s.metodo, amount: Number(s.amount) }));
    return `${base} | split=${JSON.stringify(minimal)}`;
  }
  return base;
}

function validateCartItems(items: CartItem[]): string | null {
  if (!Array.isArray(items) || items.length === 0) return "Carrello vuoto";
  for (const it of items) {
    if (!it || typeof it !== "object") return "Item carrello non valido";
    if (!isValidKind(String(it.kind))) return `Kind non valido: ${it.kind}`;
    if (typeof it.label !== "string" || it.label.trim().length === 0) return "Label mancante";
    if (typeof it.quantity !== "number" || it.quantity <= 0 || !Number.isFinite(it.quantity)) {
      return "Quantità non valida";
    }
    if (typeof it.unitPrice !== "number" || !Number.isFinite(it.unitPrice)) {
      return "Prezzo non valido";
    }
    if (it.refId !== null && it.refId !== undefined && !isValidUUID(String(it.refId))) {
      return "refId non valido";
    }
    if (it.staffId && !isValidUUID(String(it.staffId))) return "staffId non valido";
    if (it.kind === "card_regalo") {
      if (!it.cardRegalo || typeof it.cardRegalo.value !== "number" || it.cardRegalo.value <= 0) {
        return "Card regalo senza valore";
      }
    }
  }
  return null;
}

function sumSplit(rows: SplitPaymentRow[]): number {
  return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================
// MAIN ACTION
// ============================================

/**
 * Crea una transaction + N transaction_items a partire da un CartState.
 *
 * - Se cart contiene `card_regalo`, genera un voucher per ciascuno e
 *   lo linka all'item tramite `generated_voucher_id`.
 * - Se `splitPayments` è presente, forza metodo_pagamento="split" e
 *   serializza il dettaglio in fondo a `descrizione` (no schema change).
 * - Se metodo (singolo o split-row) include `saldo`, scala l'importo dal
 *   portafoglio cliente via `addWalletTransaction(tipo="utilizzo")`. In caso
 *   di errore sul wallet, fa rollback eliminando la transaction creata.
 * - Aggiorna `clients.totale_speso` / `totale_visite` / `ultima_visita`
 *   coerente con `transactions.createTransaction`.
 * - Rollback NON disponibile per errori sui line items (client supabase
 *   basic, no RPC). La transaction resta creata ma l'errore viene riportato.
 */
export async function createCartTransaction(
  input: CreateCartTransactionInput,
): Promise<CreateCartTransactionResult> {
  const { cart, scontoImporto = 0, voucherId = null, splitPayments, data } = input;

  // 1) validazione struttura
  const cartErr = validateCartItems(cart?.items ?? []);
  if (cartErr) return { ok: false, error: cartErr };

  const useSplit = Array.isArray(splitPayments) && splitPayments.length > 0;
  const metodo = useSplit ? "split" : input.metodoPagamento;
  if (!metodo) return { ok: false, error: "Metodo di pagamento mancante" };
  if (!isValidMetodo(metodo)) return { ok: false, error: "Metodo non valido" };

  if (useSplit) {
    for (const row of splitPayments!) {
      if (!row || !isValidMetodo(String(row.metodo)) || row.metodo === "split") {
        return { ok: false, error: "Split payment: metodo non valido" };
      }
      if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount <= 0) {
        return { ok: false, error: "Split payment: importo non valido" };
      }
    }
  }

  const dateStr = data ?? todayIso();
  if (!isValidDate(dateStr)) return { ok: false, error: "Data non valida" };

  if (cart.clientId && !isValidUUID(String(cart.clientId))) {
    return { ok: false, error: "clientId non valido" };
  }
  if (voucherId && !isValidUUID(String(voucherId))) {
    return { ok: false, error: "voucherId non valido" };
  }

  // 2) calcolo totale
  const subtotal = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const sconto = Math.max(0, Number(scontoImporto) || 0);
  const totale = Math.round((subtotal - sconto) * 100) / 100;

  // Accetta totale 0 solo se *tutti* gli item hanno unitPrice 0 (improbabile
  // ma tecnicamente valido — es. omaggio). Totale negativo = sempre invalido.
  if (totale < 0) return { ok: false, error: "Totale non valido" };
  if (totale === 0 && subtotal > 0) {
    // Sconto totale (voucher/coupon che copre tutto) — permesso, la transaction
    // serve comunque per tracciare il pagamento. Vai avanti.
  }
  if (totale === 0 && subtotal === 0) {
    return { ok: false, error: "Totale non valido" };
  }

  // Coerenza split: la somma deve pareggiare il totale (±1 centesimo).
  if (useSplit) {
    const s = sumSplit(splitPayments!);
    if (Math.abs(s - totale) > 0.01) {
      return { ok: false, error: "Split payment: somma non pareggia il totale" };
    }
  }

  // Pre-validazione "saldo": calcolo quota da scalare dal portafoglio.
  // - metodo singolo "saldo" -> tutto il totale
  // - split con riga "saldo" -> somma delle righe saldo
  let saldoUsato = 0;
  if (!useSplit && metodo === "saldo") {
    saldoUsato = totale;
  } else if (useSplit) {
    saldoUsato = round2(
      splitPayments!
        .filter((r) => r.metodo === "saldo")
        .reduce((s, r) => s + (Number(r.amount) || 0), 0),
    );
  }

  if (saldoUsato > 0) {
    if (!cart.clientId) {
      return { ok: false, error: "Cliente obbligatorio per pagamento con saldo" };
    }
    const saldoCorrente = await getClientWalletBalance(cart.clientId);
    if (saldoCorrente < saldoUsato - 0.005) {
      return {
        ok: false,
        error: `Saldo insufficiente (saldo €${saldoCorrente.toFixed(2)}, richiesti €${saldoUsato.toFixed(2)})`,
      };
    }
  }

  const supabase = createAdminClient();

  // 3) insert transactions row (una sola)
  const categoria = truncate(sanitizeString(deriveCategoria(cart.items)), 50);
  const descrizione = truncate(sanitizeString(deriveDescrizione(cart.items, splitPayments)), 500);

  const { data: txRow, error: txErr } = await supabase
    .from("transactions")
    .insert({
      client_id: cart.clientId || null,
      tipo: "entrata",
      categoria,
      descrizione,
      importo: totale,
      metodo_pagamento: metodo,
      data: dateStr,
    })
    .select("id")
    .single();

  if (txErr || !txRow?.id) {
    return { ok: false, error: txErr?.message || "Errore creazione transazione" };
  }
  const transactionId = txRow.id as string;

  // 4) genera voucher per ogni card_regalo PRIMA di inserire gli items,
  //    così l'item può avere già il generated_voucher_id. Se un voucher
  //    fallisce, segna il link come null ma non blocca il checkout.
  const generatedVoucherCodes: string[] = [];
  const voucherIdByCartItemId = new Map<string, string>();

  for (const it of cart.items) {
    if (it.kind !== "card_regalo") continue;
    const codice = await insertCardRegaloVoucher(
      supabase,
      it.cardRegalo!.value,
      it.cardRegalo?.label ?? it.label,
      cart.clientId,
    );
    if (codice) {
      voucherIdByCartItemId.set(it.id, codice.id);
      generatedVoucherCodes.push(codice.codice);
    }
  }

  // 5) insert transaction_items batch
  const itemsPayload = cart.items.map((it) => ({
    transaction_id: transactionId,
    kind: it.kind,
    ref_id: it.refId || null,
    label: truncate(sanitizeString(it.label), 500),
    quantity: it.quantity,
    unit_price: it.unitPrice,
    staff_id: it.staffId || null,
    generated_voucher_id: voucherIdByCartItemId.get(it.id) ?? null,
  }));

  const { error: itemsErr } = await supabase.from("transaction_items").insert(itemsPayload);
  if (itemsErr) {
    return { ok: false, error: `Transaction ${transactionId} creata ma errore line items: ${itemsErr.message}` };
  }

  // 6) scala il saldo dal portafoglio se richiesto (post-creazione transaction).
  //    Se fallisce, rollback completo: cancella la transaction (cascade pulisce
  //    transaction_items). Eventuali voucher card_regalo già emessi restano,
  //    ma in modo sicuro perché non sono linkati a items eliminati.
  if (saldoUsato > 0 && cart.clientId) {
    try {
      await addWalletTransaction({
        clientId: cart.clientId,
        tipo: "utilizzo",
        importo: saldoUsato,
        descrizione: `Pagamento checkout #${transactionId.slice(0, 8)}`,
        appointmentId: cart.appointmentId ?? null,
        transactionId,
      });
    } catch (err) {
      // Rollback: cancella transaction (cascade rimuove transaction_items).
      await supabase.from("transaction_items").delete().eq("transaction_id", transactionId);
      await supabase.from("transactions").delete().eq("id", transactionId);
      const msg = err instanceof Error ? err.message : "Errore wallet";
      return { ok: false, error: `Errore scalamento saldo: ${msg}` };
    }
  }

  // 7) aggiorna cliente (allineato a transactions.createTransaction)
  if (cart.clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("totale_speso, totale_visite")
      .eq("id", cart.clientId)
      .single();
    if (client) {
      await supabase
        .from("clients")
        .update({
          totale_speso: (Number(client.totale_speso) || 0) + totale,
          totale_visite: (Number(client.totale_visite) || 0) + 1,
          ultima_visita: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cart.clientId);
    }
  }

  return { ok: true, transactionId, generatedVoucherCodes };
}

/**
 * Inserisce un voucher tipo=importo con codice CR-XXXXX per la vendita
 * di una card regalo. Ritorna { id, codice } o null se non riesce dopo
 * 10 tentativi di code collision.
 */
async function insertCardRegaloVoucher(
  supabase: ReturnType<typeof createAdminClient>,
  valore: number,
  descrizione: string,
  acquistatoDaId: string | null,
): Promise<{ id: string; codice: string } | null> {
  let codice = generateVoucherCode();
  for (let attempts = 0; attempts < 10; attempts++) {
    const { data: existing } = await supabase
      .from("vouchers")
      .select("id")
      .eq("codice", codice)
      .maybeSingle();
    if (!existing) break;
    codice = generateVoucherCode();
  }

  const { data: row, error } = await supabase
    .from("vouchers")
    .insert({
      codice,
      tipo: "importo",
      valore,
      descrizione: truncate(sanitizeString(descrizione), 200),
      acquistato_da_id: acquistatoDaId || null,
      usato: false,
    })
    .select("id, codice")
    .single();

  if (error || !row) return null;
  return { id: row.id as string, codice: row.codice as string };
}
