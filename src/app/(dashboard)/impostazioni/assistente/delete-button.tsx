"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteDocument } from "@/lib/actions/ai-assistant";

export function DeleteDocumentButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Eliminare "${nome}"? Questa operazione non è reversibile.`)) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Errore durante l'eliminazione");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label={`Elimina ${nome}`}
    >
      <Trash2 className="h-4 w-4 text-danger" />
    </Button>
  );
}
