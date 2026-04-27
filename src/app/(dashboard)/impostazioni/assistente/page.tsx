export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { Plus, FileText, BarChart3, Lock, Users, Bot } from "lucide-react";
import { getDocuments, isAdmin } from "@/lib/actions/ai-assistant";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteDocumentButton } from "./delete-button";

export default async function AssistenteImpostazioniPage() {
  const [docs, admin] = await Promise.all([getDocuments(), isAdmin()]);
  const supabase = createAdminClient();
  const { count: logsCount } = await supabase
    .from("ai_query_logs")
    .select("*", { count: "exact", head: true });

  const byCategory = docs.reduce<Record<string, typeof docs>>((acc, d) => {
    acc[d.categoria] ??= [];
    acc[d.categoria].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-rose" />
            <h1 className="font-display text-3xl">Assistente AI</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestisci i documenti che l&apos;assistente usa per rispondere.
            {admin ? " Sei amministratore." : " Accesso in sola lettura."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/impostazioni/assistente/logs">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4" /> Log query
            </Button>
          </Link>
          {admin && (
            <Link href="/impostazioni/assistente/nuovo">
              <Button>
                <Plus className="h-4 w-4" /> Nuovo documento
              </Button>
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Documenti</p>
          <p className="mt-1 text-2xl font-bold">{docs.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Categorie</p>
          <p className="mt-1 text-2xl font-bold">{Object.keys(byCategory).length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Query storiche</p>
          <p className="mt-1 text-2xl font-bold">{logsCount ?? 0}</p>
        </Card>
      </section>

      {docs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessun documento caricato</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            L&apos;assistente risponderà solo in base alla sua conoscenza generale.
            Carica protocolli, procedure e policy per ottenere risposte accurate.
          </p>
          {admin && (
            <Link href="/impostazioni/assistente/nuovo" className="mt-6 inline-block">
              <Button>
                <Plus className="h-4 w-4" /> Carica il primo documento
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, rows]) => (
              <section key={cat}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </h2>
                <div className="space-y-2">
                  {rows.map((d) => {
                    const vis = (d as { visibilita?: string }).visibilita ?? "tutti";
                    return (
                      <Card key={d.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="rounded-md bg-muted p-2 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{d.nome}</p>
                              {d.descrizione && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {d.descrizione}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <VisibilityBadge vis={vis} />
                                <span>·</span>
                                <span>
                                  Creato{" "}
                                  {new Date(d.created_at).toLocaleDateString("it-IT")}
                                </span>
                                {d.created_by_email && (
                                  <>
                                    <span>·</span>
                                    <span>{d.created_by_email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {admin && <DeleteDocumentButton id={d.id} nome={d.nome} />}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function VisibilityBadge({ vis }: { vis: string }) {
  if (vis === "admin") {
    return (
      <Badge variant="warning">
        <Lock className="mr-1 h-3 w-3" /> Solo admin
      </Badge>
    );
  }
  if (vis === "operatrice") {
    return (
      <Badge variant="primary">
        <Users className="mr-1 h-3 w-3" /> Operatrici
      </Badge>
    );
  }
  return <Badge variant="outline">Visibile a tutti</Badge>;
}
