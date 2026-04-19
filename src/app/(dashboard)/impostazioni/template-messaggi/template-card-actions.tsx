"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { updateTemplate, deleteTemplate } from "@/lib/actions/messages";

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

  function onToggle() {
    startTransition(async () => {
      try {
        await updateTemplate(id, { attivo: !attivo });
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Errore aggiornamento");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Eliminare il template "${nome}"? Operazione non reversibile.`)) return;
    startTransition(async () => {
      try {
        await deleteTemplate(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Errore eliminazione");
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
