export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Plus, MessageSquare } from "lucide-react";
import { getAllTemplates } from "@/lib/actions/messages";
import { TemplatesList } from "./templates-list";

export default async function TemplateMessaggiPage() {
  const templates = await getAllTemplates();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-rose" />
            <h1 className="font-display text-3xl">Template messaggi</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Modelli per messaggi automatici e campagne
          </p>
        </div>
        <Link href="/impostazioni/template-messaggi/nuovo">
          <Button>
            <Plus className="h-4 w-4" /> Nuovo template
          </Button>
        </Link>
      </header>

      <TemplatesList templates={templates} />
    </div>
  );
}
