"use client";

import { useEffect, useState } from "react";
import { Drawer, Avatar, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Label } from "@/components/ui";
import { Phone, Mail, Calendar as CalIcon, Heart } from "lucide-react";
import { formatCurrency, formatPhone } from "@/lib/utils";
import type { TableRow } from "@/types/database";

type Client = TableRow<"clients">;

interface ClientDrawerProps {
  client: Client | null;
  onClose: () => void;
}

interface Interaction {
  id: string;
  tipo: string;
  descrizione: string | null;
  importo: number | null;
  created_at: string;
}

interface Appointment {
  id: string;
  data: string;
  ora_inizio: string;
  stato: string;
  services?: { nome: string } | null;
}

export function ClientDrawer({ client, onClose }: ClientDrawerProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/v2/clients/${client.id}/interactions`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/v2/clients/${client.id}/appointments`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([i, a]) => {
        if (cancelled) return;
        setInteractions(i);
        setAppointments(a);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!client) return null;

  const fullName = `${client.nome} ${client.cognome}`.trim();

  return (
    <Drawer open={!!client} onClose={onClose} title={fullName} width="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar name={fullName} size="xl" color="#C97A7A" />
          <div className="min-w-0 flex-1">
            {client.telefono && (
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formatPhone(client.telefono)}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="primary">{client.segmento}</Badge>
              {(client.totale_visite ?? 0) > 0 && (
                <Badge variant="success">{client.totale_visite} visite</Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="appuntamenti">Appuntamenti</TabsTrigger>
            <TabsTrigger value="interazioni">Interazioni</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data di nascita" value={client.data_nascita ?? "—"} />
              <Field
                label="Fonte"
                value={client.fonte ?? "—"}
              />
              <Field
                label="Ultima visita"
                value={
                  client.ultima_visita
                    ? new Date(client.ultima_visita).toLocaleDateString("it-IT")
                    : "Nessuna"
                }
              />
              <Field
                label="Totale speso"
                value={formatCurrency(client.totale_speso ?? 0)}
                strong
              />
              <Field
                label="Indirizzo"
                value={client.indirizzo ?? "—"}
                className="sm:col-span-2"
              />
            </div>
          </TabsContent>
          <TabsContent value="appuntamenti">
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Caricamento…</p>
            ) : appointments.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nessun appuntamento.</p>
            ) : (
              <ul className="divide-y divide-border">
                {appointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(a.data).toLocaleDateString("it-IT")} · {a.ora_inizio.slice(0, 5)}
                      </div>
                      <div className="text-xs text-muted-foreground">{a.services?.nome ?? ""}</div>
                    </div>
                    <Badge
                      variant={
                        a.stato === "confermato"
                          ? "success"
                          : a.stato === "completato"
                          ? "primary"
                          : a.stato === "cancellato"
                          ? "danger"
                          : "default"
                      }
                    >
                      {a.stato}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="interazioni">
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Caricamento…</p>
            ) : interactions.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nessuna interazione registrata.</p>
            ) : (
              <ul className="divide-y divide-border">
                {interactions.map((i) => (
                  <li key={i.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{i.tipo}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                    {i.descrizione && <p className="mt-1 text-sm">{i.descrizione}</p>}
                    {i.importo != null && (
                      <p className="mt-1 text-sm font-semibold">{formatCurrency(i.importo)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="note">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {client.note || "Nessuna nota."}
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1">
            <Heart className="h-4 w-4" /> Preferito
          </Button>
          <Button className="flex-1">
            <CalIcon className="h-4 w-4" /> Nuovo appuntamento
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function Field({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <p className={strong ? "text-sm font-semibold" : "text-sm"}>{value}</p>
    </div>
  );
}
