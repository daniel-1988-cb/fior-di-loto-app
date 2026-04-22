"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer, Avatar, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Label } from "@/components/ui";
import { Phone, Mail, Calendar as CalIcon, Pencil, Save, X } from "lucide-react";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { updateClient } from "@/lib/actions/clients";
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
  const router = useRouter();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Client | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    setLoading(true);
    setEditMode(false);
    setEdited(null);
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

  const view = edited ?? client;
  const fullName = `${view.nome} ${view.cognome}`.trim();

  function setField<K extends keyof Client>(key: K, value: Client[K]) {
    setEdited((prev) => ({ ...(prev ?? client!), [key]: value }) as Client);
  }

  async function handleSave() {
    if (!edited) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    try {
      await updateClient(edited.id, {
        nome: edited.nome || undefined,
        cognome: edited.cognome || undefined,
        telefono: edited.telefono ?? undefined,
        email: edited.email ?? undefined,
        dataNascita: edited.data_nascita ?? undefined,
        indirizzo: edited.indirizzo ?? undefined,
        fonte: edited.fonte ?? undefined,
        note: edited.note ?? undefined,
      });
      setEditMode(false);
      router.refresh();
    } catch (e) {
      alert(`Errore salvataggio: ${e instanceof Error ? e.message : "sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEdited(null);
    setEditMode(false);
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

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
            {editMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nome</Label>
                  <input
                    className={inputClass}
                    value={view.nome ?? ""}
                    onChange={(e) => setField("nome", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Cognome</Label>
                  <input
                    className={inputClass}
                    value={view.cognome ?? ""}
                    onChange={(e) => setField("cognome", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <input
                    className={inputClass}
                    value={view.telefono ?? ""}
                    onChange={(e) => setField("telefono", e.target.value)}
                    placeholder="es. 3331234567"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    className={inputClass}
                    value={view.email ?? ""}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data di nascita</Label>
                  <input
                    type="date"
                    className={inputClass}
                    value={view.data_nascita ?? ""}
                    onChange={(e) => setField("data_nascita", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Fonte</Label>
                  <input
                    className={inputClass}
                    value={view.fonte ?? ""}
                    onChange={(e) => setField("fonte", e.target.value)}
                    placeholder="whatsapp, instagram, passaparola…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Indirizzo</Label>
                  <input
                    className={inputClass}
                    value={view.indirizzo ?? ""}
                    onChange={(e) => setField("indirizzo", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Note</Label>
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={view.note ?? ""}
                    onChange={(e) => setField("note", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data di nascita" value={view.data_nascita ?? "—"} />
                <Field label="Fonte" value={view.fonte ?? "—"} />
                <Field
                  label="Ultima visita"
                  value={
                    view.ultima_visita
                      ? new Date(view.ultima_visita).toLocaleDateString("it-IT")
                      : "Nessuna"
                  }
                />
                <Field
                  label="Totale speso"
                  value={formatCurrency(view.totale_speso ?? 0)}
                  strong
                />
                <Field
                  label="Indirizzo"
                  value={view.indirizzo ?? "—"}
                  className="sm:col-span-2"
                />
              </div>
            )}
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
          {editMode ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4" /> Annulla
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4" /> {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditMode(true)}
              >
                <Pencil className="h-4 w-4" /> Modifica
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  router.push(`/agenda/nuovo?clientId=${client.id}`);
                  onClose();
                }}
              >
                <CalIcon className="h-4 w-4" /> Nuovo appuntamento
              </Button>
            </>
          )}
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
