"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_QUICK_ACTIONS, type QuickAction, type QuickActionId } from "./types";

/**
 * Chiave localStorage per la config utente delle azioni rapide.
 * Bump della versione => scarta la config vecchia (senza crashare).
 */
export const STORAGE_KEY = "fdl_quick_actions_v1";

/** Schema JSON persistito. */
export interface StoredQuickActions {
  version: 1;
  actions: Array<{
    id: QuickActionId;
    enabled: boolean;
    orderIndex: number;
  }>;
}

/** Default config derivata da DEFAULT_QUICK_ACTIONS (ordine + enabled). */
export function buildDefaultConfig(): StoredQuickActions {
  return {
    version: 1,
    actions: DEFAULT_QUICK_ACTIONS.map((a, i) => ({
      id: a.id,
      enabled: a.enabledByDefault,
      orderIndex: i,
    })),
  };
}

/**
 * Parsa il JSON salvato. Ritorna null se invalido / version mismatch.
 * Esportata per poter essere testata senza dover montare il hook.
 */
export function parseStored(raw: string | null): StoredQuickActions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: number }).version !== 1 ||
      !Array.isArray((parsed as { actions?: unknown }).actions)
    ) {
      return null;
    }
    const actions = (parsed as StoredQuickActions).actions.filter(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.enabled === "boolean" &&
        typeof a.orderIndex === "number",
    );
    return { version: 1, actions };
  } catch {
    return null;
  }
}

/**
 * Unisce la config stored con i default: elimina id sconosciuti,
 * aggiunge id nuovi in coda con i loro default, preserva ordine utente.
 */
export function mergeWithDefaults(stored: StoredQuickActions | null): StoredQuickActions {
  const base = buildDefaultConfig();
  if (!stored) return base;

  const storedById = new Map(stored.actions.map((a) => [a.id, a] as const));

  // 1) Azioni conosciute: rispetta ordine + enabled dello stored.
  const known = stored.actions
    .filter((a) => DEFAULT_QUICK_ACTIONS.some((d) => d.id === a.id))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((a, i) => ({ id: a.id, enabled: a.enabled, orderIndex: i }));

  // 2) Nuove azioni (es. aggiunte in release future): append con default enabled.
  const missing = base.actions
    .filter((a) => !storedById.has(a.id))
    .map((a, i) => ({ id: a.id, enabled: a.enabled, orderIndex: known.length + i }));

  return { version: 1, actions: [...known, ...missing] };
}

export interface UseQuickActionsReturn {
  /** Azioni ordinate + arricchite con icon/label/handler (TUTTE, anche disabled). */
  actions: Array<QuickAction & { enabled: boolean; orderIndex: number }>;
  /** Solo quelle abilitate, in ordine utente. */
  enabledActions: Array<QuickAction & { enabled: boolean; orderIndex: number }>;
  /** True dopo il mount (evita hydration mismatch). */
  mounted: boolean;
  toggle: (id: QuickActionId) => void;
  move: (id: QuickActionId, direction: "up" | "down") => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

/**
 * Hook di gestione azioni rapide con persistenza localStorage.
 *
 * SSR safety: al primo render ritorniamo sempre i default (senza leggere
 * localStorage), e segnaliamo `mounted=false`. I componenti consumer
 * possono usare `mounted` per evitare mismatch in hydration.
 */
export function useQuickActions(): UseQuickActionsReturn {
  const [config, setConfig] = useState<StoredQuickActions>(() => buildDefaultConfig());
  const [mounted, setMounted] = useState(false);

  // Carica da localStorage al mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setConfig(mergeWithDefaults(parseStored(raw)));
    } catch {
      setConfig(buildDefaultConfig());
    }
    setMounted(true);
  }, []);

  // Persisti ad ogni change (ma solo dopo mount, così non soffochiamo il default).
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* quota piena / storage disabilitato → silent fail */
    }
  }, [config, mounted]);

  const enrich = useCallback(
    (c: StoredQuickActions) => {
      return c.actions
        .map((stored) => {
          const def = DEFAULT_QUICK_ACTIONS.find((d) => d.id === stored.id);
          if (!def) return null;
          return { ...def, enabled: stored.enabled, orderIndex: stored.orderIndex };
        })
        .filter((x): x is QuickAction & { enabled: boolean; orderIndex: number } => !!x)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },
    [],
  );

  const actions = useMemo(() => enrich(config), [config, enrich]);
  const enabledActions = useMemo(() => actions.filter((a) => a.enabled), [actions]);

  const toggle = useCallback((id: QuickActionId) => {
    setConfig((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    }));
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const sorted = [...prev.actions].sort((a, b) => a.orderIndex - b.orderIndex);
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= sorted.length ||
        toIndex >= sorted.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return {
        ...prev,
        actions: sorted.map((a, i) => ({ ...a, orderIndex: i })),
      };
    });
  }, []);

  const move = useCallback(
    (id: QuickActionId, direction: "up" | "down") => {
      setConfig((prev) => {
        const sorted = [...prev.actions].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex((a) => a.id === id);
        if (idx < 0) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
        const [moved] = sorted.splice(idx, 1);
        sorted.splice(targetIdx, 0, moved);
        return {
          ...prev,
          actions: sorted.map((a, i) => ({ ...a, orderIndex: i })),
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setConfig(buildDefaultConfig());
  }, []);

  return { actions, enabledActions, mounted, toggle, move, reorder, reset };
}
