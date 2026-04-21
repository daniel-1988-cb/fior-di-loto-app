import { describe, it, expect } from "vitest";
import { addToBuffer, takeReady, type BufferDb } from "@/lib/bot/message-buffer";

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
