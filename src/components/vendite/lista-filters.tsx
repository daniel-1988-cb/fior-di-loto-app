"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button, Input, Label, Select } from "@/components/ui";
import { Download } from "lucide-react";

const METODI = [
  "contanti",
  "carta",
  "bonifico",
  "satispay",
  "paypal",
  "buono",
  "saldo",
  "qr",
  "self_service",
  "split",
  "assegno",
  "fattura",
  "finanziaria",
  "altro",
];

export function ListaFilters({
  initialFrom,
  initialTo,
  initialMetodo,
  initialTipo,
}: {
  initialFrom: string;
  initialTo: string;
  initialMetodo: string;
  initialTipo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [metodo, setMetodo] = useState(initialMetodo);
  const [tipo, setTipo] = useState(initialTipo);
  const [exporting, setExporting] = useState(false);
  const [, startTransition] = useTransition();

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    if (metodo) params.set("metodo", metodo);
    else params.delete("metodo");
    if (tipo) params.set("tipo", tipo);
    else params.delete("tipo");
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const reset = () => {
    setFrom("");
    setTo("");
    setMetodo("");
    setTipo("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (metodo) params.set("metodo", metodo);
      if (tipo) params.set("tipo", tipo);
      const res = await fetch(`/vendite/lista/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export fallito");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `vendite-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Errore durante l'esportazione.");
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-5">
      <div>
        <Label htmlFor="f-from">Da</Label>
        <Input
          id="f-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="f-to">A</Label>
        <Input
          id="f-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="f-metodo">Metodo</Label>
        <Select
          id="f-metodo"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
        >
          <option value="">Tutti</option>
          {METODI.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-tipo">Tipo</Label>
        <Select
          id="f-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Tutti</option>
          <option value="entrata">Entrata</option>
          <option value="uscita">Uscita</option>
        </Select>
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={apply} className="flex-1">
          Applica
        </Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
      <div className="md:col-span-5 flex justify-end">
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          <Download className="h-4 w-4" /> {exporting ? "Esportazione…" : "Esporta CSV"}
        </Button>
      </div>
    </div>
  );
}
