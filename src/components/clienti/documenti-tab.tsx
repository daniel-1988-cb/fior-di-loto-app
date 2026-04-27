"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Download, FileText, Loader2 } from "lucide-react";
import {
  DOCUMENT_TIPO_LABEL,
  VALID_DOCUMENT_TIPI,
  type ClientDocument,
  type DocumentTipo,
} from "@/lib/types/client-documents";
import { deleteClientDocument } from "@/lib/actions/client-documents";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DocumentiTab({
  clientId,
  documents,
}: {
  clientId: string;
  documents: ClientDocument[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<DocumentTipo>("altro");
  const [nome, setNome] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!file) {
      setUploadError("Seleziona un file");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Il file supera la dimensione massima di 10 MB");
      return;
    }

    const fd = new FormData();
    fd.set("clientId", clientId);
    fd.set("tipo", tipo);
    if (nome.trim()) fd.set("nome", nome.trim());
    if (note.trim()) fd.set("note", note.trim());
    fd.set("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/client-documents/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(data.error || "Errore durante l'upload");
        return;
      }
      // Reset
      setNome("");
      setNote("");
      setFile(null);
      setTipo("altro");
      const input = document.getElementById(
        "doc-file-input"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    } catch (err) {
      console.error(err);
      setUploadError("Errore di rete");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Eliminare questo documento?",
      message: "L'azione non si può annullare.",
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteClientDocument(id);
      if (!res.ok) {
        toast.error(`Errore: ${res.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="mb-4 text-sm font-semibold text-brown">
          Carica un nuovo documento
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-brown">
              File <span className="text-muted-foreground">(max 10 MB, immagine o PDF)</span>
            </span>
            <input
              id="doc-file-input"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-brown file:mr-3 file:rounded-full file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-rose-dark"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-brown">
              Tipo
            </span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DocumentTipo)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
            >
              {VALID_DOCUMENT_TIPI.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-brown">
              Nome documento{" "}
              <span className="text-muted-foreground">(opzionale)</span>
            </span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Lasciato vuoto: usa il nome del file"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-brown">
              Note <span className="text-muted-foreground">(opzionale)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
            />
          </label>
        </div>

        {uploadError && (
          <p className="mt-3 text-sm text-destructive">{uploadError}</p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={uploading || !file}
            className="inline-flex items-center gap-2 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-dark disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Caricamento..." : "Carica"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-semibold text-brown">
            Documenti{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({documents.length})
            </span>
          </h3>
        </div>
        {documents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun documento caricato.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Caricato il</th>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 text-brown">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.nome}</p>
                          {d.note && (
                            <p className="truncate text-xs text-muted-foreground">
                              {d.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {DOCUMENT_TIPO_LABEL[
                        d.tipo as DocumentTipo
                      ] || d.tipo}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatUploadDate(d.created_at)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatBytes(d.size_bytes)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/client-documents/${d.id}/download`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-brown"
                          title="Scarica"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          disabled={pending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
