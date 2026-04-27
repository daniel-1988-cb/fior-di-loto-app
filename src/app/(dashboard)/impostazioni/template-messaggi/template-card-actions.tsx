"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { updateTemplate, deleteTemplate } from "@/lib/actions/messages";
import { useToast } from "@/lib/hooks/use-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";

export function TemplateCardActions({
  id,
  nome,
  attivo,
}: {
  id: string;
  nome: string;
  attivo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  function onToggle() {
    startTransition(async () => {
      try {
        await updateTemplate(id, { attivo: !attivo });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore aggiornamento");
      }
    });
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Eliminare il template "${nome}"?`,
      message: "Operazione non reversibile.",
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteTemplate(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore eliminazione");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        disabled={pending}
        aria-label={attivo ? `Disattiva ${nome}` : `Attiva ${nome}`}
        title={attivo ? "Disattiva" : "Attiva"}
      >
        <Power className={`h-4 w-4 ${attivo ? "text-success" : "text-muted-foreground"}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={pending}
        aria-label={`Elimina ${nome}`}
        title="Elimina"
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </div>
  );
}
