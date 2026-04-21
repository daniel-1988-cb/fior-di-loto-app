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
