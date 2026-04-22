import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export type VenditeTableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  cell: (row: T) => ReactNode;
  className?: string;
};

export type VenditeTableProps<T> = {
  columns: VenditeTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: ReactNode;
  onRowClickAttrs?: (row: T) => Record<string, string> | undefined;
  footer?: ReactNode;
  caption?: ReactNode;
};

/**
 * Reusable table used by /vendite pages. Server-component friendly.
 *
 * Interactive per-row actions (e.g. clipboard copy) are handled via
 * `onRowClickAttrs` which emits `data-*` attributes read by client
 * components mounted on the same page.
 */
export function VenditeTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nessun risultato.",
  onRowClickAttrs,
  footer,
  caption,
}: VenditeTableProps<T>) {
  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <Card className="overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-medium ${alignClass(c.align)} ${c.className ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const extra = onRowClickAttrs?.(row) ?? {};
                const interactive = onRowClickAttrs != null;
                return (
                  <tr
                    key={rowKey(row)}
                    className={`hover:bg-muted/40 ${
                      interactive ? "cursor-pointer" : ""
                    }`}
                    {...extra}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3 ${alignClass(c.align)} ${c.className ?? ""}`}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer ? (
            <tfoot className="border-t border-border bg-muted/20 text-sm font-medium">
              {footer}
            </tfoot>
          ) : null}
        </table>
      </div>
    </Card>
  );
}
