export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { marketingSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { Plus, Send, MessageCircle, Mail } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function V2CampagnePage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("message_templates")
    .select("*")
    .eq("attivo", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const templates = data ?? [];

  const channelIcon = (canale: string) => {
    if (canale === "whatsapp") return <MessageCircle className="h-4 w-4 text-success" />;
    if (canale === "email") return <Mail className="h-4 w-4 text-info" />;
    return <Send className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <V2Shell subNav={{ title: "Marketing", groups: marketingSubNav }}>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campagne di massa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invia offerte e aggiornamenti a un gruppo di clienti.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Nuova campagna
        </Button>
      </header>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Nessuna campagna</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Crea un template messaggio per avviare la tua prima campagna WhatsApp o email.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">{channelIcon(t.canale)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{t.nome}</h3>
                      <Badge variant="outline" className="uppercase">
                        {t.canale}
                      </Badge>
                      {t.categoria && <Badge variant="primary">{t.categoria}</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.contenuto}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Invia
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </V2Shell>
  );
}
