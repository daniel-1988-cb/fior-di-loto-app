import { NextResponse } from "next/server";
import { getTransazioniList } from "@/lib/actions/vendite";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const metodo = url.searchParams.get("metodo") || undefined;
  const tipoParam = url.searchParams.get("tipo") || undefined;
  const tipo =
    tipoParam === "entrata" || tipoParam === "uscita" ? tipoParam : undefined;

  try {
    const { rows } = await getTransazioniList({
      dataFrom: from,
      dataTo: to,
      metodo,
      tipo,
      limit: 10000,
      offset: 0,
    });

    const headers = [
      "Data",
      "Cliente",
      "Categoria",
      "Descrizione",
      "Metodo",
      "Tipo",
      "Importo",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.data),
          csvEscape(r.clienteNome ?? ""),
          csvEscape(r.categoria ?? ""),
          csvEscape(r.descrizione),
          csvEscape(r.metodoPagamento ?? ""),
          csvEscape(r.tipo),
          csvEscape(r.importo.toFixed(2)),
        ].join(",")
      );
    }
    const csv = "\uFEFF" + lines.join("\n");

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendite-${stamp}.csv"`,
      },
    });
  } catch (e) {
    console.error("[vendite export]", e);
    return NextResponse.json({ error: "Export fallito" }, { status: 500 });
  }
}
