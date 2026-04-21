"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import {
  createBotDocument,
  updateBotDocument,
  deleteBotDocument,
  type WaBotDoc,
} from "@/lib/actions/wa-bot-documents";

type Props = { initialDocs: WaBotDoc[] };

export function BotDocumentsManager({ initialDocs }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [pending, start] = useTransition();

  function onAdd() {
    if (!titolo.trim() || !contenuto.trim()) return;
    start(async () => {
      const res = await createBotDocument({ titolo, contenuto });
      if (res.ok) {
        setTitolo("");
        setContenuto("");
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
        <button
          onClick={onAdd}
          disabled={pending || !titolo.trim() || !contenuto.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Aggiungi documento
        </button>
      </div>

      <div className="space-y-2">
        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessun documento ancora. Aggiungi il primo sopra.
          </p>
        )}
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-brown">{d.titolo}</h3>
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
}
