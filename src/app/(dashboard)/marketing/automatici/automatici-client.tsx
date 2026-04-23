"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Select,
} from "@/components/ui";
import { Plus, Bell, Cake, RotateCcw, Heart, Edit3, Trash2, Zap } from "lucide-react";
import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationAttivo,
  type Automation,
  type TriggerTipo,
} from "@/lib/actions/marketing-automations";

const TRIGGER_LABELS: Record<TriggerTipo, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string; hasDays: boolean; daysLabel: string }> = {
  inattivita_giorni: {
    label: "Inattività",
    icon: RotateCcw,
    desc: "Clienti senza visita da N giorni",
    hasDays: true,
    daysLabel: "Giorni senza visita",
  },
  nuovo_cliente: {
    label: "Nuovo cliente",
    icon: Heart,
    desc: "Benvenuto alle nuove entrate",
    hasDays: true,
    daysLabel: "Giorni dalla registrazione (max)",
  },
  compleanno: {
    label: "Compleanno",
    icon: Cake,
    desc: "Auguri nel giorno del compleanno",
    hasDays: false,
    daysLabel: "",
  },
  post_visita: {
    label: "Post visita",
    icon: Bell,
    desc: "Follow-up N giorni dopo la visita",
    hasDays: true,
    daysLabel: "Giorni dopo la visita",
  },
};

type FormState = {
  nome: string;
  triggerTipo: TriggerTipo;
  giorni: string;
  canale: "whatsapp" | "email" | "sms";
  body: string;
};

const EMPTY: FormState = {
  nome: "",
  triggerTipo: "inattivita_giorni",
  giorni: "60",
  canale: "whatsapp",
  body: "",
};

export function AutomaticiClient({ automations }: { automations: Automation[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openNew() {
    setForm(EMPTY);
    setError(null);
    setEditing("new");
  }

  function openEdit(a: Automation) {
    setForm({
      nome: a.nome,
      triggerTipo: a.triggerTipo,
      giorni: a.triggerConfig.giorni ? String(a.triggerConfig.giorni) : "60",
      canale: a.canale === "sms" ? "sms" : a.canale === "email" ? "email" : "whatsapp",
      body: a.body,
    });
    setError(null);
    setEditing(a.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  async function handleToggle(a: Automation) {
    await toggleAutomationAttivo(a.id, !a.attivo);
    router.refresh();
  }

  async function handleDelete(a: Automation) {
    if (!confirm(`Elimina l'automazione "${a.nome}"?`)) return;
    const res = await deleteAutomation(a.id);
    if (!res.ok) {
      alert(res.error ?? "Errore eliminazione");
      return;
    }
    router.refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nome.trim()) return setError("Nome obbligatorio");
    if (!form.body.trim()) return setError("Testo obbligatorio");

    const cfg = TRIGGER_LABELS[form.triggerTipo].hasDays
      ? { giorni: parseInt(form.giorni, 10) || undefined }
      : {};
    if (TRIGGER_LABELS[form.triggerTipo].hasDays) {
      const g = parseInt(form.giorni, 10);
      if (!Number.isInteger(g) || g <= 0)
        return setError("Giorni deve essere un intero positivo");
    }

    const payload = {
      nome: form.nome.trim(),
      triggerTipo: form.triggerTipo,
      triggerConfig: cfg,
      canale: form.canale,
      body: form.body.trim(),
    };

    start(async () => {
      try {
        if (editing === "new") {
          await createAutomation(payload);
        } else if (editing) {
          await updateAutomation(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messaggi automatici</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Regole che girano in background. Il cron le valuta alle 09:00 ogni giorno.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nuova regola
        </Button>
      </header>

      {automations.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessuna regola configurata</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crea la prima automazione per riattivare clienti inattivi, salutare i nuovi
            arrivati o fare gli auguri per il compleanno.
          </p>
          <Button className="mt-4" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuova regola
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => {
            const info = TRIGGER_LABELS[a.triggerTipo];
            const Icon = info.icon;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.nome}</h3>
                      <Badge variant="outline" className="uppercase">
                        {a.canale}
                      </Badge>
                      <Badge variant="default">{info.label}</Badge>
                      {info.hasDays && a.triggerConfig.giorni && (
                        <Badge variant="default">{a.triggerConfig.giorni} gg</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{info.desc}</p>
                    {a.ultimaEsecuzione && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ultima esecuzione:{" "}
                        {new Date(a.ultimaEsecuzione).toLocaleString("it-IT")}
                      </p>
                    )}
                  </div>
                  <ToggleSwitch
                    attivo={a.attivo}
                    onToggle={() => handleToggle(a)}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
          onClick={close}
        >
          <Card
            className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submit} className="p-6">
              <h2 className="mb-4 text-xl font-semibold">
                {editing === "new" ? "Nuova regola" : "Modifica regola"}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="auto-nome">Nome *</Label>
                  <Input
                    id="auto-nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Es. Riattivazione inattive 60gg"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="auto-trig">Trigger *</Label>
                    <Select
                      id="auto-trig"
                      value={form.triggerTipo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          triggerTipo: e.target.value as TriggerTipo,
                        })
                      }
                    >
                      <option value="inattivita_giorni">Inattività</option>
                      <option value="nuovo_cliente">Nuovo cliente</option>
                      <option value="compleanno">Compleanno</option>
                      <option value="post_visita">Post visita</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="auto-can">Canale *</Label>
                    <Select
                      id="auto-can"
                      value={form.canale}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          canale: e.target.value as FormState["canale"],
                        })
                      }
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS (non attivo)</option>
                    </Select>
                  </div>
                </div>
                {TRIGGER_LABELS[form.triggerTipo].hasDays && (
                  <div>
                    <Label htmlFor="auto-gg">
                      {TRIGGER_LABELS[form.triggerTipo].daysLabel}
                    </Label>
                    <Input
                      id="auto-gg"
                      type="number"
                      min="1"
                      value={form.giorni}
                      onChange={(e) => setForm({ ...form, giorni: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="auto-body">Testo *</Label>
                  <Textarea
                    id="auto-body"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    rows={6}
                    placeholder="Ciao {{nome}}, è un po' che non ti vediamo..."
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Personalizza con {`{{nome}}`} e {`{{cognome}}`}.
                  </p>
                </div>
                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={pending}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvataggio…" : "Salva"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

function ToggleSwitch({
  attivo,
  onToggle,
}: {
  attivo: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
        (attivo ? "bg-primary" : "bg-muted")
      }
      aria-label={attivo ? "Disattiva" : "Attiva"}
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
          (attivo ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}
