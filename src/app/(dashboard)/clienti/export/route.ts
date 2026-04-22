import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidSegmento,
  sanitizeString,
  truncate,
} from "@/lib/security/validate";
import type { TableRow } from "@/types/database";

type Client = TableRow<"clients">;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatTags(raw: Client["tags"]): string {
  if (!Array.isArray(raw)) return "";
  return raw.filter((t) => typeof t === "string").join("; ");
}

/**
 * GET /clienti/export — returns a UTF-8 BOM CSV of the clients list,
 * honoring the same filters the list page supports.
 *
 * Query params:
 *   - segmento: lead|nuova|lotina|inattiva|vip (optional)
 *   - search:   freeform (max 100 chars, sanitized)
 *   - from:     ultima_visita >= YYYY-MM-DD (optional)
 *   - to:       ultima_visita <= YYYY-MM-DD (optional)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const segParam = url.searchParams.get("segmento") || "";
  const searchParam = url.searchParams.get("search") || "";
  const fromParam = url.searchParams.get("from") || "";
  const toParam = url.searchParams.get("to") || "";

  const safeSeg =
    segParam && segParam !== "tutti" && isValidSegmento(segParam)
      ? segParam
      : null;
  const safeSearch = searchParam
    ? truncate(sanitizeString(searchParam), 100)
    : null;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const safeFrom = isoDate.test(fromParam) ? fromParam : null;
  const safeTo = isoDate.test(toParam) ? toParam : null;

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("clients")
      .select("*")
      .order("cognome", { ascending: true })
      .limit(10000);

    if (safeSeg) query = query.eq("segmento", safeSeg);
    if (safeSearch) {
      query = query.or(
        `nome.ilike.%${safeSearch}%,cognome.ilike.%${safeSearch}%,telefono.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
      );
    }
    if (safeFrom) query = query.gte("ultima_visita", safeFrom);
    if (safeTo) query = query.lte("ultima_visita", safeTo);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as Client[];

    const headers = [
      "Nome",
      "Cognome",
      "Telefono",
      "Email",
      "Data nascita",
      "Segmento",
      "Fonte",
      "Totale speso",
      "Totale visite",
      "Ultima visita",
      "Tags",
      "Bloccata",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.nome ?? ""),
          csvEscape(r.cognome ?? ""),
          csvEscape(r.telefono ?? ""),
          csvEscape(r.email ?? ""),
          csvEscape(r.data_nascita ?? ""),
          csvEscape(r.segmento ?? ""),
          csvEscape(r.fonte ?? ""),
          csvEscape(Number(r.totale_speso ?? 0).toFixed(2)),
          csvEscape(r.totale_visite ?? 0),
          csvEscape(r.ultima_visita ?? ""),
          csvEscape(formatTags(r.tags)),
          csvEscape(r.blocked ? "sì" : "no"),
        ].join(",")
      );
    }
    const csv = "\uFEFF" + lines.join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clienti-${stamp}.csv"`,
      },
    });
  } catch (e) {
    console.error("[clienti export]", e);
    return NextResponse.json({ error: "Export fallito" }, { status: 500 });
  }
}
