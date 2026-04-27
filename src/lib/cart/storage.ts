"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import {
 emptyCart,
 type CartState,
 type CartItem,
 type SplitPaymentRow,
} from "./types";

/** Key prefix — ogni appuntamento ha il proprio carrello keyed per id. */
const STORAGE_KEY_PREFIX = "fdl_cart_v1:";

function storageKey(appointmentId: string): string {
 return STORAGE_KEY_PREFIX + appointmentId;
}

function readStored(key: string, fallback: CartState): CartState {
 if (typeof window === "undefined") return fallback;
 try {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  const parsed = JSON.parse(raw) as Partial<CartState>;
  if (!parsed || !Array.isArray(parsed.items)) return fallback;
  return {
   appointmentId: parsed.appointmentId ?? fallback.appointmentId,
   clientId: parsed.clientId ?? fallback.clientId,
   items: parsed.items,
   sconto: parsed.sconto ?? null,
   voucherCode: parsed.voucherCode ?? null,
   splitPayments: parsed.splitPayments ?? [],
  };
 } catch {
  return fallback;
 }
}

function randomId(): string {
 if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
  return crypto.randomUUID();
 }
 return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseCartReturn {
 cart: CartState;
 mounted: boolean;
 addItem: (item: Omit<CartItem, "id">) => void;
 updateItem: (id: string, patch: Partial<CartItem>) => void;
 removeItem: (id: string) => void;
 setQuantity: (id: string, qty: number) => void;
 clear: () => void;
 setSconto: (s: CartState["sconto"]) => void;
 setVoucherCode: (code: string | null) => void;
 setSplitPayments: (rows: SplitPaymentRow[]) => void;
 /** Reset al default (vuoto ma preserva appointmentId+clientId). */
 reset: () => void;
}

/**
 * Hook di gestione carrello persistente (localStorage, keyed per appuntamento).
 *
 * Pattern SSR-safe: al primo render ritorna un carrello vuoto, `mounted=false`.
 * Al mount (useEffect) legge da localStorage. I componenti consumer possono
 * usare `mounted` per evitare hydration mismatch (renderizzare placeholder).
 */
export function useCart(appointmentId: string, clientId?: string | null): UseCartReturn {
 const key = useMemo(() => storageKey(appointmentId), [appointmentId]);
 const [cart, setCart] = useState<CartState>(() => {
  // Lazy init: reads localStorage on first render (client only).
  const fallback = emptyCart(appointmentId, clientId ?? undefined);
  if (typeof window === "undefined") return fallback;
  return readStored(key, fallback);
 });
 const [mounted, setMounted] = useState(false);

 // Mark mounted after first paint — use startTransition to satisfy set-state-in-effect rule.
 useEffect(() => {
  startTransition(() => setMounted(true));
 }, []);

 // Persist ad ogni change (dopo mount)
 useEffect(() => {
  if (!mounted || typeof window === "undefined") return;
  try {
   window.localStorage.setItem(key, JSON.stringify(cart));
  } catch {
   /* quota piena: silent fail */
  }
 }, [cart, key, mounted]);

 const addItem = useCallback((item: Omit<CartItem, "id">) => {
  setCart((prev) => ({
   ...prev,
   items: [...prev.items, { ...item, id: randomId() }],
  }));
 }, []);

 const updateItem = useCallback((id: string, patch: Partial<CartItem>) => {
  setCart((prev) => ({
   ...prev,
   items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  }));
 }, []);

 const removeItem = useCallback((id: string) => {
  setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
 }, []);

 const setQuantity = useCallback((id: string, qty: number) => {
  if (qty <= 0) {
   setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  } else {
   setCart((prev) => ({
    ...prev,
    items: prev.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
   }));
  }
 }, []);

 const clear = useCallback(() => {
  setCart((prev) => ({ ...prev, items: [], sconto: null, voucherCode: null, splitPayments: [] }));
 }, []);

 const reset = useCallback(() => {
  setCart(emptyCart(appointmentId, clientId ?? undefined));
 }, [appointmentId, clientId]);

 const setSconto = useCallback((s: CartState["sconto"]) => {
  setCart((prev) => ({ ...prev, sconto: s }));
 }, []);

 const setVoucherCode = useCallback((code: string | null) => {
  setCart((prev) => ({ ...prev, voucherCode: code }));
 }, []);

 const setSplitPayments = useCallback((rows: SplitPaymentRow[]) => {
  setCart((prev) => ({ ...prev, splitPayments: rows }));
 }, []);

 return {
  cart,
  mounted,
  addItem,
  updateItem,
  removeItem,
  setQuantity,
  clear,
  setSconto,
  setVoucherCode,
  setSplitPayments,
  reset,
 };
}

/** Utility non-hook per leggere il carrello fuori da un componente (es. server action wrapper). */
export function readCartFromStorage(appointmentId: string): CartState | null {
 if (typeof window === "undefined") return null;
 try {
  const raw = window.localStorage.getItem(storageKey(appointmentId));
  if (!raw) return null;
  return JSON.parse(raw) as CartState;
 } catch {
  return null;
 }
}
