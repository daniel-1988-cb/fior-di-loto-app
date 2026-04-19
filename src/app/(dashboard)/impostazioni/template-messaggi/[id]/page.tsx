export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/actions/messages";
import { EditForm } from "./edit-form";

export default async function ModificaTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  return (
    <EditForm
      initial={{
        id: template.id,
        nome: template.nome,
        canale: template.canale,
        categoria: template.categoria,
        contenuto: template.contenuto,
        attivo: template.attivo,
      }}
    />
  );
}
