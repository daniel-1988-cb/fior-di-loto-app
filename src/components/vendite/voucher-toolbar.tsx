"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, Label } from "@/components/ui";

const STATI = [
  { value: "attivo", label: "Attivi" },
  { value: "usato", label: "Usati" },
  { value: "scaduto", label: "Scaduti" },
  { value: "all", label: "Tutti" },
];

export function VoucherToolbar({ initialStato }: { initialStato: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stato, setStato] = useState(initialStato);
  const [toast, setToast] = useState<string | null>(null);

  // Global click listener: any table row with data-voucher-codice copies to clipboard.
  useEffect(() => {
    const handler = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tr = target?.closest("[data-voucher-codice]") as HTMLElement | null;
      if (!tr) return;
      const codice = tr.getAttribute("data-voucher-codice");
      if (!codice) return;
      try {
        await navigator.clipboard.writeText(codice);
        setToast(`Codice ${codice} copiato`);
        setTimeout(() => setToast(null), 2200);
      } catch {
        setToast("Copia fallita");
        setTimeout(() => setToast(null), 2200);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const onChange = (v: string) => {
    setStato(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v && v !== "attivo") params.set("stato", v);
    else params.delete("stato");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        <div>
          <Label htmlFor="v-stato">Stato</Label>
          <Select
            id="v-stato"
            value={stato}
            onChange={(e) => onChange(e.target.value)}
          >
            {STATI.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-3 flex items-end text-xs text-muted-foreground">
          Clicca su una riga per copiare il codice voucher.
        </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
