"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteDocument } from "@/lib/actions/ai-assistant";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

export function DeleteDocumentButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  async function onDelete() {
    const ok = await confirm({
      title: `Eliminare "${nome}"?`,
      message: "Questa operazione non è reversibile.",
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione");
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
