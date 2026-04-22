import { describe, it, expect } from "vitest";
import {
  addToBuffer,
  takeReady,
  aggregateClaimedRows,
  type BufferDb,
} from "@/lib/bot/message-buffer";

describe("message-buffer", () => {
  it("adds rows and returns them on takeReady, then marks processed", () => {
    const rows: Array<{ id: string; phone: string; content: string; processed: boolean }> = [];
    const db: BufferDb = {
      insert: (r) => {
        rows.push({ id: String(rows.length + 1), phone: r.phone, content: r.content, processed: false });
      },
      selectOlderThan: (phone) => rows.filter((r) => r.phone === phone && !r.processed),
      markProcessed: (ids) => {
        rows.forEach((r) => {
          if (ids.includes(r.id)) r.processed = true;
        });
      },
    };
    addToBuffer(db, "393331234567", "Ciao");
    addToBuffer(db, "393331234567", "Info?");
    const ready = takeReady(db, "393331234567", 4000);
    expect(ready.length).toBe(2);
    expect(ready.map((r) => r.content)).toEqual(["Ciao", "Info?"]);
    expect(rows.every((r) => r.processed)).toBe(true);
  });

  it("returns empty when no rows", () => {
    const db: BufferDb = {
      insert: () => {},
      selectOlderThan: () => [],
      markProcessed: () => {},
    };
    expect(takeReady(db, "393331234567", 4000)).toEqual([]);
  });
});

describe("aggregateClaimedRows", () => {
  it("sorts by receivedAt ascending and joins with newlines", () => {
    const rows = [
      { content: "seconda riga", receivedAt: "2026-04-22T10:00:02Z" },
      { content: "prima riga", receivedAt: "2026-04-22T10:00:00Z" },
      { content: "terza", receivedAt: "2026-04-22T10:00:05Z" },
    ];
    expect(aggregateClaimedRows(rows)).toBe("prima riga\nseconda riga\nterza");
  });

  it("accepts Date objects and ISO strings interchangeably", () => {
    const rows = [
      { content: "B", receivedAt: new Date("2026-04-22T10:00:01Z") },
      { content: "A", receivedAt: "2026-04-22T10:00:00Z" },
    ];
    expect(aggregateClaimedRows(rows)).toBe("A\nB");
  });

  it("trims whitespace and drops empty fragments", () => {
    const rows = [
      { content: "  hi  ", receivedAt: "2026-04-22T10:00:00Z" },
      { content: "   ", receivedAt: "2026-04-22T10:00:01Z" },
      { content: "there", receivedAt: "2026-04-22T10:00:02Z" },
    ];
    expect(aggregateClaimedRows(rows)).toBe("hi\nthere");
  });

  it("returns empty string for no rows", () => {
    expect(aggregateClaimedRows([])).toBe("");
  });
});

// Concurrency smoke — simulate the Supabase "atomic claim" pattern:
// UPDATE wa_message_buffer SET processed_at=NOW() WHERE phone=? AND processed_at IS NULL RETURNING *.
// We model the table as an array and the claim as a synchronous swap guarded
// by Promise scheduling — only one concurrent "handler" should get the rows.
describe("message buffer — concurrent claim", () => {
  type Row = { id: string; phone: string; content: string; processedAt: string | null };

  function makeStore() {
    const rows: Row[] = [];
    // Atomic claim: returns and marks unclaimed rows in a single synchronous step.
    const claim = (phone: string): Row[] => {
      const matching = rows.filter((r) => r.phone === phone && r.processedAt === null);
      if (matching.length === 0) return [];
      const now = new Date().toISOString();
      matching.forEach((r) => {
        r.processedAt = now;
      });
      return matching.map((r) => ({ ...r }));
    };
    return { rows, claim };
  }

  it("multiple inserts on the same phone → one handler claims all rows", () => {
    const { rows, claim } = makeStore();
    rows.push(
      { id: "1", phone: "+39333", content: "a", processedAt: null },
      { id: "2", phone: "+39333", content: "b", processedAt: null },
      { id: "3", phone: "+39333", content: "c", processedAt: null },
    );

    const first = claim("+39333");
    const second = claim("+39333");

    expect(first.map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(second).toEqual([]);
    expect(rows.every((r) => r.processedAt !== null)).toBe(true);
  });

  it("two simulated concurrent handlers → exactly one gets the rows", async () => {
    const { rows, claim } = makeStore();
    rows.push({ id: "1", phone: "+39999", content: "x", processedAt: null });

    // Kick both handlers into the microtask queue; the claim itself is a
    // synchronous swap, so whichever resolves its delay first wins.
    const [a, b] = await Promise.all([
      Promise.resolve().then(() => claim("+39999")),
      Promise.resolve().then(() => claim("+39999")),
    ]);

    const aHasRow = a.length === 1;
    const bHasRow = b.length === 1;
    expect(aHasRow !== bHasRow).toBe(true); // exactly one
  });

  it("rows for different phones do not interfere", () => {
    const { rows, claim } = makeStore();
    rows.push(
      { id: "1", phone: "+39111", content: "a", processedAt: null },
      { id: "2", phone: "+39222", content: "b", processedAt: null },
    );
    expect(claim("+39111").map((r) => r.id)).toEqual(["1"]);
    expect(claim("+39222").map((r) => r.id)).toEqual(["2"]);
  });
});
