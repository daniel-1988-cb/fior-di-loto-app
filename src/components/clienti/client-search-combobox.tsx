"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, User, Phone } from "lucide-react";
import { searchClientsQuick, type ClientSearchResult } from "@/lib/actions/clients";

type Props = {
 /** Cliente selezionato (id) — controlla il valore visibile. */
 value: string | null;
 onChange: (clientId: string | null, client: ClientSearchResult | null) => void;
 placeholder?: string;
 required?: boolean;
 /** Nome campo form (per a11y / autofill). */
 name?: string;
 /** id dell'input interno — usato da <label htmlFor>. */
 inputId?: string;
};

const DEBOUNCE_MS = 200;

/**
 * Combobox con server-side search sui clienti. Sostituisce i vecchi
 * `<select>` con 500+ option che rallentavano il rendering. Query viaggia
 * via server action con GIN trigram indexes — ritorno <50ms anche con 4k+
 * righe in tabella.
 */
export function ClientSearchCombobox({
 value,
 onChange,
 placeholder = "Cerca cliente per nome, cognome, telefono o email...",
 required,
 name,
 inputId,
}: Props) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState("");
 const [results, setResults] = useState<ClientSearchResult[]>([]);
 const [loading, setLoading] = useState(false);
 const [selected, setSelected] = useState<ClientSearchResult | null>(null);
 const [highlight, setHighlight] = useState(0);
 const rootRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 // Load initial (ultimi modificati) quando si apre
 useEffect(() => {
  if (!open) return;
  let cancelled = false;
  setLoading(true);
  const t = setTimeout(async () => {
   try {
    const rows = await searchClientsQuick(query.trim() || undefined);
    if (!cancelled) {
     setResults(rows);
     setHighlight(0);
    }
   } catch (e) {
    console.error("[client-combobox] search failed", e);
    if (!cancelled) setResults([]);
   } finally {
    if (!cancelled) setLoading(false);
   }
  }, DEBOUNCE_MS);
  return () => {
   cancelled = true;
   clearTimeout(t);
  };
 }, [query, open]);

 // Resolve ID iniziale → fetch dettagli
 useEffect(() => {
  if (!value) {
   setSelected(null);
   return;
  }
  if (selected?.id === value) return;
  let cancelled = false;
  (async () => {
   const rows = await searchClientsQuick(""); // ultimi
   if (cancelled) return;
   const match = rows.find((r) => r.id === value);
   if (match) setSelected(match);
  })();
  return () => {
   cancelled = true;
  };
 }, [value, selected?.id]);

 // Click outside
 useEffect(() => {
  if (!open) return;
  function onDown(e: MouseEvent) {
   if (!rootRef.current) return;
   if (!rootRef.current.contains(e.target as Node)) setOpen(false);
  }
  function onKey(e: KeyboardEvent) {
   if (e.key === "Escape") {
    setOpen(false);
    inputRef.current?.blur();
   }
  }
  window.addEventListener("mousedown", onDown);
  window.addEventListener("keydown", onKey);
  return () => {
   window.removeEventListener("mousedown", onDown);
   window.removeEventListener("keydown", onKey);
  };
 }, [open]);

 const pick = useCallback(
  (c: ClientSearchResult) => {
   setSelected(c);
   onChange(c.id, c);
   setOpen(false);
   setQuery("");
  },
  [onChange],
 );

 function clear() {
  setSelected(null);
  onChange(null, null);
  setQuery("");
  inputRef.current?.focus();
 }

 function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "ArrowDown") {
   e.preventDefault();
   setHighlight((h) => Math.min(h + 1, results.length - 1));
  } else if (e.key === "ArrowUp") {
   e.preventDefault();
   setHighlight((h) => Math.max(h - 1, 0));
  } else if (e.key === "Enter") {
   if (results[highlight]) {
    e.preventDefault();
    pick(results[highlight]);
   }
  }
 }

 const displayLabel = selected
  ? `${selected.nome} ${selected.cognome}`.trim()
  : "";

 return (
  <div ref={rootRef} className="relative">
   {/* hidden input per form submit nativo */}
   {name && (
    <input type="hidden" name={name} value={value ?? ""} required={required} />
   )}

   {/* Trigger/search input */}
   <div
    className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors ${
     open ? "border-rose ring-2 ring-rose/20" : "border-input"
    }`}
    onClick={() => {
     setOpen(true);
     inputRef.current?.focus();
    }}
   >
    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
    <input
     ref={inputRef}
     id={inputId}
     type="text"
     value={open ? query : displayLabel}
     onChange={(e) => setQuery(e.target.value)}
     onFocus={() => setOpen(true)}
     onKeyDown={onKeyDown}
     placeholder={selected ? "" : placeholder}
     className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
     autoComplete="off"
     aria-autocomplete="list"
     aria-expanded={open}
     aria-controls="client-combobox-listbox"
    />
    {selected && (
     <button
      type="button"
      onClick={(e) => {
       e.stopPropagation();
       clear();
      }}
      className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Rimuovi cliente"
     >
      <X className="h-4 w-4" />
     </button>
    )}
   </div>

   {/* Dropdown results */}
   {open && (
    <div
     id="client-combobox-listbox"
     role="listbox"
     className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
    >
     {loading && (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
       Ricerca...
      </div>
     )}
     {!loading && results.length === 0 && (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
       {query.trim()
        ? `Nessun cliente trovato per "${query.trim()}"`
        : "Inizia a scrivere per cercare..."}
      </div>
     )}
     {!loading &&
      results.map((r, i) => (
       <button
        key={r.id}
        type="button"
        onClick={() => pick(r)}
        onMouseEnter={() => setHighlight(i)}
        role="option"
        aria-selected={highlight === i}
        className={`flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
         highlight === i ? "bg-muted" : "hover:bg-muted/50"
        }`}
       >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose/10 text-xs font-semibold text-rose">
         {(r.nome?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
         <p className="truncate font-medium text-foreground">
          {r.nome} {r.cognome}
         </p>
         <p className="flex items-center gap-3 truncate text-xs text-muted-foreground">
          {r.telefono && (
           <span className="inline-flex items-center gap-0.5">
            <Phone className="h-3 w-3" />
            {r.telefono}
           </span>
          )}
          {r.email && <span className="truncate">{r.email}</span>}
         </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
         {r.segmento}
        </span>
       </button>
      ))}
    </div>
   )}
  </div>
 );
}

ClientSearchCombobox.defaultIcon = User;
