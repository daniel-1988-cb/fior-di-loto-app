import { Shell } from "@/components/layout/shell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  Button,
} from "@/components/ui";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

export default function V2PreviewPage() {
  return (
    <Shell
      subNav={{
        title: "Report",
        groups: [
          {
            items: [
              { href: "/reports", label: "Tutti i report", badge: 53 },
              { href: "/reports/favorites", label: "Preferiti", badge: 1 },
              { href: "/reports/dashboards", label: "Dashboard", badge: 3 },
              { href: "/reports/standard", label: "Standard", badge: 45 },
              { href: "/reports/premium", label: "Premium", badge: 8 },
              { href: "/reports/custom", label: "Personalizzabile", badge: 0 },
              { href: "/reports/goals", label: "Obiettivi" },
            ],
          },
          {
            title: "Cartelle",
            items: [
              { href: "/reports/data-connector", label: "Data Connector" },
            ],
          },
        ],
      }}
    >
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard v2</h1>
          <p className="mt-2 text-muted-foreground">
            Anteprima layout shell Fase 1 — icon sidebar, topbar, sub-sidebar.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendite recenti</CardTitle>
            <CardDescription>Ultimi 7 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold">€ 4.995,75</p>
              <span className="mb-1 inline-flex items-center gap-1 text-sm text-success">
                <TrendingUp className="h-4 w-4" /> +12%
              </span>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Appuntamenti </span>
                <span className="font-semibold">166</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valore medio </span>
                <span className="font-semibold">€ 30,09</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimi appuntamenti</CardTitle>
            <CardDescription>Prossimi 7 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold">159</p>
              <span className="mb-1 inline-flex items-center gap-1 text-sm text-danger">
                <TrendingDown className="h-4 w-4" /> -3%
              </span>
            </div>
            <div className="mt-4 flex gap-3">
              <Badge variant="success">143 confermati</Badge>
              <Badge variant="danger">16 annullati</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">I servizi migliori</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Servizio</th>
                  <th className="pb-2 text-right font-medium">Questo mese</th>
                  <th className="pb-2 text-right font-medium">Scorso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["HC | Semipermanente Mani", 79, 74],
                  ["EP | Sopracciglia", 57, 69],
                  ["Pedicure Curativo", 49, 53],
                  ["EP | Labbro Superiore", 37, 47],
                  ["MASS | Massaggio Decontratturante", 32, 37],
                ].map(([name, cur, prev]) => (
                  <tr key={name as string}>
                    <td className="py-2.5 font-medium">{name}</td>
                    <td className="py-2.5 text-right">{cur}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{prev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Miglior membro del team</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                ["Jessica", 2382, "#C97A7A"],
                ["Rosa", 2111, "#C8A96E"],
                ["Gloria", 1860, "#6B4EFF"],
                ["Silvia", 1747, "#4CAF50"],
                ["Daniela", 1415, "#FF9800"],
              ].map(([name, value, color]) => (
                <li key={name as string} className="flex items-center gap-3">
                  <Avatar name={name as string} size="sm" color={color as string} />
                  <span className="flex-1 text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    € {(value as number).toLocaleString("it-IT")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        Fase 1 del refactor • Layout shell con IconSidebar + Topbar + SubSidebar • Pattern ispirati a Fresha.
      </footer>
    </Shell>
  );
}
