import { marketingSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { Bell, Heart, Cake, RotateCcw } from "lucide-react";

const automations = [
  {
    nome: "Promemoria appuntamento 24h",
    descrizione: "Invia un WhatsApp 24 ore prima dell'appuntamento.",
    icon: Bell,
    canale: "WhatsApp",
    attivo: true,
  },
  {
    nome: "Compleanno cliente",
    descrizione: "Saluta le clienti con un augurio personalizzato nel giorno del compleanno.",
    icon: Cake,
    canale: "WhatsApp",
    attivo: true,
  },
  {
    nome: "Ritorno assente",
    descrizione: "Riattiva chi non prenota da 60+ giorni con un messaggio dedicato.",
    icon: RotateCcw,
    canale: "SMS",
    attivo: false,
  },
  {
    nome: "Post-trattamento",
    descrizione: "Chiedi una recensione 2 giorni dopo la visita.",
    icon: Heart,
    canale: "Email",
    attivo: false,
  },
];

export default function V2AutomaticiPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Messaggi automatici</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Automazioni che lavorano per te senza doverci pensare.
        </p>
      </header>

      <div className="space-y-3">
        {automations.map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.nome} className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{a.nome}</h3>
                    <Badge variant="outline">{a.canale}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.descrizione}</p>
                </div>
                <Badge variant={a.attivo ? "success" : "default"}>
                  {a.attivo ? "Attivo" : "Disattivato"}
                </Badge>
                <Button variant="outline" size="sm">
                  Modifica
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
