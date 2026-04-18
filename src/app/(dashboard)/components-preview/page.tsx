"use client";

import { useState } from "react";
import { Calendar, Search, Plus, Heart, Star } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Drawer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Select,
} from "@/components/ui";

export default function ComponentsPreviewPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Components Preview</h1>
        <p className="mt-2 text-muted-foreground">
          Design system Fase 0 — primitive UI ispirate al pattern Fresha.
        </p>
      </header>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent (rose)</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline" aria-label="Add">
            <Plus className="h-4 w-4" />
          </Button>
          <Button disabled>Disabled</Button>
          <Button>
            <Plus className="h-4 w-4" /> Con icona
          </Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inputs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="i1">Nome cliente</Label>
            <Input id="i1" placeholder="Es. Mario Rossi" />
          </div>
          <div>
            <Label htmlFor="i2">Telefono</Label>
            <Input id="i2" type="tel" defaultValue="+39 329 322 8341" />
          </div>
          <div>
            <Label htmlFor="i3">Categoria</Label>
            <Select id="i3" defaultValue="massaggi">
              <option value="massaggi">Massaggi</option>
              <option value="viso">Trattamenti viso</option>
              <option value="corpo">Trattamenti corpo</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="i4">Disabled</Label>
            <Input id="i4" disabled placeholder="Campo disabilitato" />
          </div>
        </div>
        <div>
          <Label htmlFor="ta">Note</Label>
          <Textarea id="ta" placeholder="Note aggiuntive…" rows={3} />
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Confermato</Badge>
          <Badge variant="warning">In attesa</Badge>
          <Badge variant="danger">Annullato</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Avatars */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Avatars</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Laura Rossi" size="sm" />
          <Avatar name="Giovanni Bianchi" size="md" />
          <Avatar name="Maria Verdi" size="lg" />
          <Avatar name="Anna" size="xl" color="#C97A7A" />
          <Avatar name="Sara" size="md" color="#C8A96E" />
          <Avatar name="Elena" size="md" color="#6B4EFF" />
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendite recenti</CardTitle>
              <CardDescription>Ultimi 7 giorni</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">€ 4.995,75</p>
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
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/15 p-2 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Prossimi appuntamenti</CardTitle>
                  <CardDescription>Prossimi 7 giorni</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">159</p>
              <div className="mt-4 flex gap-3">
                <Badge variant="success">143 confermati</Badge>
                <Badge variant="danger">16 annullati</Badge>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm">
                Vai al calendario
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tabs (pill Fresha-style)</h2>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="vendite">Vendite</TabsTrigger>
            <TabsTrigger value="finanze">Finanze</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="clienti">Clienti</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Card>
              <CardContent className="pt-6">Contenuto Tutti</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="vendite">
            <Card>
              <CardContent className="pt-6">Vendite report</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="finanze">
            <Card>
              <CardContent className="pt-6">Finanze report</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="team">
            <Card>
              <CardContent className="pt-6">Team report</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="clienti">
            <Card>
              <CardContent className="pt-6">Clienti report</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Table</h2>
        <Card>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca clienti…" className="pl-9" />
            </div>
            <Button>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Nome cliente</TH>
                <TH>Telefono</TH>
                <TH>Recensioni</TH>
                <TH>Vendite</TH>
                <TH>Creato il</TH>
              </TR>
            </THead>
            <TBody>
              {[
                { name: "Grazia Montecarlo", phone: "+39 329 322 8341", reviews: 0, sales: "0 €", date: "18 apr 2026" },
                { name: "Daniela Ialicicco", phone: "+39 320 293 9309", reviews: 4.7, sales: "190 €", date: "17 apr 2026" },
                { name: "Dario De Marco", phone: "+39 373 848 4368", reviews: 0, sales: "0 €", date: "16 apr 2026" },
                { name: "Filomena Moffa", phone: "+39 338 161 6480", reviews: 4.9, sales: "120 €", date: "16 apr 2026" },
              ].map((c) => (
                <TR key={c.name}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size="sm" />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{c.phone}</TD>
                  <TD>
                    {c.reviews > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {c.reviews}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD className="font-medium">{c.sales}</TD>
                  <TD className="text-muted-foreground">{c.date}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>

      {/* Drawer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Drawer</h2>
        <Button variant="accent" onClick={() => setDrawerOpen(true)}>
          Apri drawer profilo cliente
        </Button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Daniela Ialicicco" width="md">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name="Daniela Ialicicco" size="xl" color="#C97A7A" />
              <div>
                <p className="text-sm text-muted-foreground">+39 320 293 9309</p>
                <p className="text-sm text-muted-foreground">daniela@email.com</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="primary">Cliente fedele</Badge>
                  <Badge variant="success">Attivo</Badge>
                </div>
              </div>
            </div>
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="app">Appuntamenti</TabsTrigger>
                <TabsTrigger value="vendite">Vendite</TabsTrigger>
                <TabsTrigger value="note">Note</TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <div className="grid gap-4">
                  <div>
                    <Label>Data nascita</Label>
                    <p className="text-sm">15 marzo 1985</p>
                  </div>
                  <div>
                    <Label>Indirizzo</Label>
                    <p className="text-sm">Via Roma 12, Campobasso</p>
                  </div>
                  <div>
                    <Label>Totale speso</Label>
                    <p className="text-sm font-semibold">€ 1.240,00</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="app">Lista appuntamenti…</TabsContent>
              <TabsContent value="vendite">Storico vendite…</TabsContent>
              <TabsContent value="note">
                <Textarea placeholder="Aggiungi nota…" rows={4} />
              </TabsContent>
            </Tabs>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Heart className="h-4 w-4" /> Preferito
              </Button>
              <Button className="flex-1">Modifica</Button>
            </div>
          </div>
        </Drawer>
      </section>

      <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
        Fase 0 del refactor • Design tokens ereditati da{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">globals.css</code> •{" "}
        Pattern ispirati a Fresha (layout, interazioni) — brand colors Fior di Loto preservati.
      </footer>
    </div>
  );
}
