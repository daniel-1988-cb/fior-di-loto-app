"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  uploadProductImage,
  deleteProductImage,
} from "@/lib/actions/products";
import { useConfirm } from "@/lib/hooks/use-confirm";

type Props = {
  productId: string;
  initialUrl: string | null;
  onChange?: (url: string | null) => void;
};

/**
 * Upload immagine prodotto via Supabase Storage bucket 'product-images'.
 * Mostra preview + bottone carica + bottone elimina. Chiama la server action
 * uploadProductImage; l'URL torna con cache-bust `?t=<ms>`.
 */
export function UploadProductImage({ productId, initialUrl, onChange }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirm = useConfirm();

  function pickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);

    startTransition(async () => {
      try {
        const newUrl = await uploadProductImage(productId, fd);
        setUrl(newUrl);
        onChange?.(newUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore upload");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  async function handleDelete() {
    if (!url) return;
    const ok = await confirm({ title: "Rimuovere l'immagine?", confirmLabel: "Rimuovi", variant: "destructive" });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteProductImage(productId);
        setUrl(null);
        onChange?.(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore rimozione");
      }
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Anteprima prodotto"
            className="h-20 w-20 rounded-lg border border-border object-cover"
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pickFile}
              disabled={isPending}
            >
              <Upload className="h-4 w-4" /> Sostituisci
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 text-danger" /> Elimina
            </Button>
          </div>
        </div>
      ) : (
        <Card className="flex items-center justify-between gap-3 p-3">
          <div className="text-xs text-muted-foreground">
            Nessuna immagine caricata (JPG/PNG/WebP, max 4MB).
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pickFile}
            disabled={isPending}
          >
            <Upload className="h-4 w-4" />
            {isPending ? "Upload..." : "Carica immagine"}
          </Button>
        </Card>
      )}

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
