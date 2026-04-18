import { V2Shell } from "@/components/layout/v2-shell";
import { marketingSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { Tag, Plus } from "lucide-react";

const sample = [
  {
    nome: "Benvenuto primavera",
    descrizione: "-15% sui massaggi rilassanti",
    validita: "Fino al 30 giugno",
    stato: "attivo",
  },
  {
    nome: "Pacchetto detox",
    descrizione: "3 trattamenti a 199 €",
    validita: "Bozza",
    stato: "bozza",
  },
];

export default function V2OfferteMarketingPage() {
  return (
    <V2Shell subNav={{ title: "Marketing", groups: marketingSubNav }}>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offerte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promo dedicate, codici sconto e offerte flash.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Nuova offerta
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {sample.map((o) => (
          <Card key={o.nome} className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Tag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{o.nome}</h3>
                  <Badge variant={o.stato === "attivo" ? "success" : "default"}>
                    {o.stato}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{o.descrizione}</p>
                <p className="mt-2 text-xs text-muted-foreground">{o.validita}</p>
              </div>
            </div>
          </Card>
        ))}

        <Card className="md:col-span-2">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aggiungi offerte per attirare nuove clienti o riattivare quelle assenti da tempo.
          </CardContent>
        </Card>
      </div>
    </V2Shell>
  );
}
