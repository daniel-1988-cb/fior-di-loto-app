export type BufferDb = {
  insert: (r: { phone: string; content: string }) => void;
  selectOlderThan: (
    phone: string,
    cutoffMs: number,
  ) => Array<{ id: string; phone: string; content: string }>;
  markProcessed: (ids: string[]) => void;
};

export function addToBuffer(db: BufferDb, phone: string, content: string): void {
  db.insert({ phone, content });
}

export function takeReady(db: BufferDb, phone: string, windowMs: number) {
  const rows = db.selectOlderThan(phone, windowMs);
  if (rows.length === 0) return [];
  db.markProcessed(rows.map((r) => r.id));
  return rows;
}

/**
 * Aggregate a batch of buffered messages (already claimed from the DB) into
 * a single user-turn string. Rows are sorted by `receivedAt` ascending so
 * the aggregation respects the order the user typed them in.
 *
 * Empty input returns an empty string — caller decides what to do.
 */
export type ClaimedBufferRow = {
  content: string;
  receivedAt: string | Date;
};

export function aggregateClaimedRows(rows: ClaimedBufferRow[]): string {
  if (rows.length === 0) return "";
  const sorted = [...rows].sort((a, b) => {
    const ta = typeof a.receivedAt === "string" ? a.receivedAt : a.receivedAt.toISOString();
    const tb = typeof b.receivedAt === "string" ? b.receivedAt : b.receivedAt.toISOString();
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  return sorted
    .map((r) => r.content.trim())
    .filter((s) => s.length > 0)
    .join("\n");
}
