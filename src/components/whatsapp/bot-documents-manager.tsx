"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import {
  createBotDocument,
  updateBotDocument,
  deleteBotDocument,
  type WaBotDoc,
} from "@/lib/actions/wa-bot-documents";
import { VALID_CATEGORIE, CATEGORIA_LABELS } from "@/lib/bot/categorie";

type Props = { initialDocs: WaBotDoc[] };

export function BotDocumentsManager({ initialDocs }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [categoria, setCategoria] = useState<string>("generale");
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onAdd() {
    if (!titolo.trim() || !contenuto.trim()) return;
    start(async () => {
      const res = await createBotDocument({ titolo, contenuto, categoria });
      if (res.ok) {
        setTitolo("");
        setContenuto("");
        setCategoria("generale");
        router.refresh();
      } else alert(res.error);
    });
  }

  function onToggle(id: string, attivo: boolean) {
    start(async () => {
      const res = await updateBotDocument(id, { attivo: !attivo });
      if (res.ok) {
        setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, attivo: !attivo } : d)));
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questo documento?")) return;
    start(async () => {
      const res = await deleteBotDocument(id);
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    });
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  // Filter + group docs by categoria
  const visibleDocs = useMemo(
    () => (filterCategoria ? docs.filter((d) => d.categoria === filterCategoria) : docs),
    [docs, filterCategoria],
  );

  const grouped = useMemo(() => {
    return visibleDocs.reduce<Record<string, WaBotDoc[]>>((acc, d) => {
      const key = d.categoria || "generale";
      (acc[key] ||= []).push(d);
      return acc;
    }, {});
  }, [visibleDocs]);

  // Only show chips for categorie actually present
  const presentCategorie = useMemo(() => {
    const set = new Set<string>();
    for (const d of docs) set.add(d.categoria || "generale");
    return Array.from(set).sort();
  }, [docs]);

  // Order groups: follow VALID_CATEGORIE order, then any unknown categoria alphabetically
  const orderedGroupKeys = useMemo(() => {
    const keys = Object.keys(grouped);
    const known = (VALID_CATEGORIE as readonly string[]).filter((c) => keys.includes(c));
    const unknown = keys.filter((k) => !(VALID_CATEGORIE as readonly string[]).includes(k)).sort();
    return [...known, ...unknown];
  }, [grouped]);

  const chipBase =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors";

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border bg-cream-dark/30 p-4">
        <input
          type="text"
          placeholder="Titolo del documento (es. 'Listino trattamenti')"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className={inputCls}
        />
        <textarea
          placeholder="Contenuto... (testo libero, markdown supportato dal modello)"
          value={contenuto}
          onChange={(e) => setContenuto(e.target.value)}
          rows={6}
          className={`${inputCls} resize-none`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
          >
            {VALID_CATEGORIE.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          <button
            onClick={onAdd}
            disabled={pending || !titolo.trim() || !contenuto.trim()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Aggiungi documento
          </button>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategoria(null)}
            className={`${chipBase} ${
              filterCategoria === null
                ? "bg-rose text-white"
                : "bg-cream-dark/50 text-brown hover:bg-cream-dark"
            }`}
          >
            Tutte ({docs.length})
          </button>
          {presentCategorie.map((c) => {
            const count = docs.filter((d) => d.categoria === c).length;
            const active = filterCategoria === c;
            return (
              <button
                key={c}
                onClick={() => setFilterCategoria(c)}
                className={`${chipBase} ${
                  active
                    ? "bg-rose text-white"
                    : "bg-cream-dark/50 text-brown hover:bg-cream-dark"
                }`}
              >
                {CATEGORIA_LABELS[c] ?? c} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-6">
        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessun documento ancora. Aggiungi il primo sopra.
          </p>
        )}
        {docs.length > 0 && visibleDocs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessun documento in questa categoria.
          </p>
        )}
        {orderedGroupKeys.map((key) => {
          const list = grouped[key] ?? [];
          const label = CATEGORIA_LABELS[key] ?? key;
          return (
            <div key={key} className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-brown">
                <span aria-hidden="true">📂</span>
                <span>{label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({list.length})
                </span>
              </h2>
              <div className="space-y-2">
                {list.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-brown">{d.titolo}</h3>
                        <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose">
                          {CATEGORIA_LABELS[d.categoria] ?? d.categoria}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={d.attivo}
                            onChange={() => onToggle(d.id, d.attivo)}
                            disabled={pending}
                          />
                          attivo
                        </label>
                        <button
                          onClick={() => onDelete(d.id)}
                          disabled={pending}
                          className="rounded p-1 text-muted-foreground hover:bg-cream-dark hover:text-red-500"
                          aria-label="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {d.contenuto}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
