import { describe, it, expect } from "vitest";
import { buildDefaultConfig, mergeWithDefaults, parseStored } from "../storage";
import { DEFAULT_QUICK_ACTIONS } from "../types";

describe("quick-actions/storage - parseStored", () => {
  it("returns null for null / empty / non-JSON input", () => {
    expect(parseStored(null)).toBeNull();
    expect(parseStored("")).toBeNull();
    expect(parseStored("not-json{")).toBeNull();
  });

  it("returns null for wrong version", () => {
    expect(
      parseStored(JSON.stringify({ version: 2, actions: [] })),
    ).toBeNull();
  });

  it("filters malformed entries in actions array", () => {
    const raw = JSON.stringify({
      version: 1,
      actions: [
        { id: "appt", enabled: true, orderIndex: 0 },
        { id: 123, enabled: true, orderIndex: 1 }, // bad id
        { id: "vendita", enabled: "yes", orderIndex: 2 }, // bad enabled
        null,
      ],
    });
    const out = parseStored(raw);
    expect(out).not.toBeNull();
    expect(out!.actions).toHaveLength(1);
    expect(out!.actions[0].id).toBe("appt");
  });
});

describe("quick-actions/storage - mergeWithDefaults", () => {
  it("returns defaults when stored is null", () => {
    const out = mergeWithDefaults(null);
    expect(out.actions).toHaveLength(DEFAULT_QUICK_ACTIONS.length);
    expect(out.actions.map((a) => a.id)).toEqual(
      DEFAULT_QUICK_ACTIONS.map((d) => d.id),
    );
  });

  it("preserves user order from stored config", () => {
    const stored = {
      version: 1 as const,
      actions: [
        { id: "vendita" as const, enabled: true, orderIndex: 0 },
        { id: "appt" as const, enabled: false, orderIndex: 1 },
      ],
    };
    const out = mergeWithDefaults(stored);
    // User-chosen order first, then unknown-to-stored defaults appended
    expect(out.actions[0].id).toBe("vendita");
    expect(out.actions[1].id).toBe("appt");
    expect(out.actions[1].enabled).toBe(false);
  });

  it("drops unknown ids and appends new defaults", () => {
    const stored = {
      version: 1 as const,
      actions: [
        { id: "obsolete_id" as never, enabled: true, orderIndex: 0 },
        { id: "appt" as const, enabled: false, orderIndex: 1 },
      ],
    };
    const out = mergeWithDefaults(stored);
    expect(out.actions.find((a) => (a.id as string) === "obsolete_id")).toBeUndefined();
    // All defaults except the obsolete one show up
    const ids = out.actions.map((a) => a.id);
    for (const d of DEFAULT_QUICK_ACTIONS) {
      expect(ids).toContain(d.id);
    }
    // appt retains stored enabled=false
    expect(out.actions.find((a) => a.id === "appt")!.enabled).toBe(false);
  });

  it("contiguous orderIndex 0..n-1 after merge", () => {
    const out = mergeWithDefaults(null);
    out.actions.forEach((a, i) => expect(a.orderIndex).toBe(i));
  });
});

describe("quick-actions/storage - buildDefaultConfig", () => {
  it("matches DEFAULT_QUICK_ACTIONS length and enabledByDefault", () => {
    const cfg = buildDefaultConfig();
    expect(cfg.version).toBe(1);
    expect(cfg.actions).toHaveLength(DEFAULT_QUICK_ACTIONS.length);
    cfg.actions.forEach((a, i) => {
      expect(a.id).toBe(DEFAULT_QUICK_ACTIONS[i].id);
      expect(a.enabled).toBe(DEFAULT_QUICK_ACTIONS[i].enabledByDefault);
    });
  });
});
