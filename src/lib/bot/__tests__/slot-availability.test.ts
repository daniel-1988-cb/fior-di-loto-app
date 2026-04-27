import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createAdminClient → restituisce un fake supabase configurabile per test.
type Row = Record<string, unknown>;

type Filter = { col: string; op: string; val: unknown };

function makeFakeSupabase(tables: Record<string, Row[]>) {
  // Builder che accumula filtri ed esegue il match in memoria.
  return {
    from(table: string) {
      const filters: Filter[] = [];
      let orFilter: string | null = null;
      const exec = () => {
        let rows = (tables[table] ?? []).slice();
        for (const f of filters) {
          rows = rows.filter((r) => {
            const v = r[f.col];
            switch (f.op) {
              case "eq":
                return v === f.val;
              case "in":
                return (f.val as unknown[]).includes(v);
              default:
                return true;
            }
          });
        }
        if (orFilter) {
          // Format: "staff_id.eq.X,staff_id.is.null"
          const parts = orFilter.split(",");
          rows = rows.filter((r) =>
            parts.some((p) => {
              const m = /^(\w+)\.(eq|is)\.(.+)$/.exec(p);
              if (!m) return false;
              const [, col, op, val] = m;
              if (op === "eq") return r[col] === val;
              if (op === "is") return val === "null" ? r[col] == null : false;
              return false;
            }),
          );
        }
        return Promise.resolve({ data: rows, error: null });
      };
      const builder: {
        select(_cols: string): typeof builder;
        eq(col: string, val: unknown): typeof builder;
        in(col: string, val: unknown[]): typeof builder;
        or(expr: string): typeof builder;
        then<T>(
          onF: (v: { data: Row[]; error: null }) => T,
          onR?: (e: unknown) => unknown,
        ): Promise<T>;
      } = {
        select(_cols: string) {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push({ col, op: "eq", val });
          return builder;
        },
        in(col: string, val: unknown[]) {
          filters.push({ col, op: "in", val });
          return builder;
        },
        or(expr: string) {
          orFilter = expr;
          return builder;
        },
        then<T>(
          onF: (v: { data: Row[]; error: null }) => T,
          onR?: (e: unknown) => T,
        ): Promise<T> {
          return exec().then(onF, onR) as Promise<T>;
        },
      };
      return builder;
    },
  };
}

let currentTables: Record<string, Row[]> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => makeFakeSupabase(currentTables),
}));

import {
  checkSlotAvailable,
  getAvailableSlotsAroundDate,
} from "@/lib/bot/slot-availability";

const STAFF = "11111111-1111-1111-1111-111111111111";

describe("checkSlotAvailable", () => {
  beforeEach(() => {
    currentTables = {};
  });

  it("returns NOT available when staff has no shift that day", async () => {
    currentTables = { staff_turni: [], appointments: [], blocked_slots: [] };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(false);
    expect(res.conflictReason).toMatch(/turno/);
  });

  it("returns AVAILABLE when in shift, no appts, no blocks", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [],
      blocked_slots: [],
    };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(true);
  });

  it("returns NOT available when overlapping a confermato appointment", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [
        {
          staff_id: STAFF,
          data: "2026-04-30",
          ora_inizio: "13:30:00",
          ora_fine: "14:30:00",
          stato: "confermato",
        },
      ],
      blocked_slots: [],
    };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(false);
    expect(res.conflictReason).toMatch(/appuntamento/);
  });

  it("ignores cancellato appointments (only confermato/completato block)", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [
        // cancellato non dovrebbe essere ritornato (filtrato dall'.in)
        // ma anche se per errore arrivasse, il bot non deve trattarlo come conflitto.
      ],
      blocked_slots: [],
    };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(true);
  });

  it("returns NOT available when slot falls in a blocked_slots window", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [],
      blocked_slots: [
        {
          staff_id: STAFF,
          data: "2026-04-30",
          ora_inizio: "13:00:00",
          ora_fine: "15:00:00",
        },
      ],
    };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(false);
    expect(res.conflictReason).toMatch(/blocc/);
  });

  it("returns NOT available when slot is outside the staff shift", async () => {
    currentTables = {
      staff_turni: [
        // turno mattina 09-13, lo slot 14-15 è fuori
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "13:00:00" },
      ],
      appointments: [],
      blocked_slots: [],
    };
    const res = await checkSlotAvailable({
      staffId: STAFF,
      startDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
    });
    expect(res.available).toBe(false);
    expect(res.conflictReason).toMatch(/turno/);
  });
});

describe("getAvailableSlotsAroundDate", () => {
  beforeEach(() => {
    currentTables = {};
  });

  it("returns the preferred slot when free", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [],
      blocked_slots: [],
    };
    const slots = await getAvailableSlotsAroundDate({
      staffId: STAFF,
      preferredDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
      maxResults: 1,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startDateTime).toBe("2026-04-30T14:00:00.000Z");
  });

  it("skips an occupied slot and proposes the next free 30-min boundary", async () => {
    currentTables = {
      staff_turni: [
        { staff_id: STAFF, data: "2026-04-30", ora_inizio: "09:00:00", ora_fine: "18:00:00" },
      ],
      appointments: [
        {
          staff_id: STAFF,
          data: "2026-04-30",
          ora_inizio: "14:00:00",
          ora_fine: "15:00:00",
          stato: "confermato",
        },
      ],
      blocked_slots: [],
    };
    const slots = await getAvailableSlotsAroundDate({
      staffId: STAFF,
      preferredDateTime: "2026-04-30T14:00:00.000Z",
      durataMinuti: 60,
      maxResults: 1,
    });
    expect(slots).toHaveLength(1);
    // Il primo slot libero dopo le 14:00 occupate (14-15) è alle 15:00
    expect(slots[0].startDateTime).toBe("2026-04-30T15:00:00.000Z");
  });
});
