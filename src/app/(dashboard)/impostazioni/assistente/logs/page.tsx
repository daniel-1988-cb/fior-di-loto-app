export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { getQueryLogs, isAdmin } from "@/lib/actions/ai-assistant";

export default async function AssistenteLogsPage() {
  const admin = await isAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-12 text-center">
          <h2 className="text-lg font-semibold">Accesso negato</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Solo gli amministratori possono visualizzare i log delle query.
          </p>
        </Card>
      </div>
    );
  }

  const logs = await getQueryLogs({ limit: 200 });

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/impostazioni/assistente"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Log query assistente</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ultime {logs.length} richieste allo staff (max 200).
        </p>
      </header>

      {logs.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nessuna query registrata.
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{l.user_email}</Badge>
                <span>{new Date(l.created_at).toLocaleString("it-IT")}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{l.domanda}</p>
              {l.risposta && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {l.risposta}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
