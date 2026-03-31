"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  exportClientiCSV,
  exportInterazioniCSV,
  exportAppuntamentiCSV,
  exportTransazioniCSV,
  exportProdottiCSV,
  exportServiziCSV,
} from "@/lib/actions/export";

type ExportItem = {
  label: string;
  filename: string;
  action: () => Promise<string>;
  color: string;
};

const exports: ExportItem[] = [
  {
    label: "Clienti",
    filename: "clienti.csv",
    action: exportClientiCSV,
    color: "bg-rose/10 text-rose hover:bg-rose/20",
  },
  {
    label: "Interazioni",
    filename: "interazioni.csv",
    action: exportInterazioniCSV,
    color: "bg-gold/10 text-gold-dark hover:bg-gold/20",
  },
  {
    label: "Appuntamenti",
    filename: "appuntamenti.csv",
    action: exportAppuntamentiCSV,
    color: "bg-info/10 text-info hover:bg-info/20",
  },
  {
    label: "Transazioni",
    filename: "transazioni.csv",
    action: exportTransazioniCSV,
    color: "bg-success/10 text-success hover:bg-success/20",
  },
  {
    label: "Prodotti",
    filename: "prodotti.csv",
    action: exportProdottiCSV,
    color: "bg-rose/10 text-rose hover:bg-rose/20",
  },
  {
    label: "Servizi",
    filename: "servizi.csv",
    action: exportServiziCSV,
    color: "bg-gold/10 text-gold-dark hover:bg-gold/20",
  },
];

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(item: ExportItem) {
    setLoading(item.filename);
    setError(null);
    try {
      const csv = await item.action();
      downloadCSV(csv, item.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'export");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 font-semibold text-brown">Export / Backup dati</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Scarica i dati del gestionale in formato CSV per backup o analisi esterne.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {exports.map((item) => {
          const isLoading = loading === item.filename;
          return (
            <button
              key={item.filename}
              onClick={() => handleExport(item)}
              disabled={loading !== null}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${item.color}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        I file CSV vengono generati in tempo reale dai dati correnti nel database.
      </p>
    </div>
  );
}
