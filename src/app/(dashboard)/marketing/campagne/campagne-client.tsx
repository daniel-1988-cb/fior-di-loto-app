"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Select,
} from "@/components/ui";
import {
  Plus,
  Send,
  MessageCircle,
  Mail,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  PlayCircle,
} from "lucide-react";
import {
  updateCampaign,
  deleteCampaign,
  sendCampaignNow,
  type Campaign,
} from "@/lib/actions/campaigns";
import { type CampaignStato } from "@/lib/constants/campaigns";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Tutti i clienti",
  lead: "Lead",
  nuova: "Nuove",
  lotina: "Lotine",
  inattiva: "Inattive",
  vip: "VIP",
};

function stateBadge(stato: CampaignStato) {
  const variants: Record<CampaignStato, { v: "default" | "primary" | "success" | "warning" | "danger"; label: string }> =
    {
      bozza: { v: "default", label: "Bozza" },
      programmata: { v: "primary", label: "Programmata" },
      in_invio: { v: "warning", label: "In invio…" },
      inviata: { v: "success", label: "Inviata" },
      errore: { v: "danger", label: "Errore" },
    };
  const c = variants[stato];
  return <Badge variant={c.v}>{c.label}</Badge>;
}

function channelIcon(canale: string) {
  if (canale === "whatsapp") return <MessageCircle className="h-4 w-4 text-success" />;
  if (canale === "email") return <Mail className="h-4 w-4 text-info" />;
  if (canale === "sms") return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  return <Send className="h-4 w-4 text-muted-foreground" />;
}

export function CampagneClient({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleDelete(c: Campaign) {
    if (!confirm(`Elimina la campagna "${c.nome}"?`)) return;
    const res = await deleteCampaign(c.id);
    if (!res.ok) {
      alert(res.error ?? "Errore eliminazione");
      return;
    }
    router.refresh();
  }

  async function handleSendNow(c: Campaign) {
    if (c.stato === "in_invio" || c.stato === "inviata") return;
    if (
      !confirm(
        `Invia subito la campagna "${c.nome}"? Verrà spedita a tutti i clienti del segmento "${
          SEGMENT_LABELS[c.segmentoTarget ?? ""]
        }".`
      )
    )
      return;
    setSendingId(c.id);
    try {
      const s = await sendCampaignNow(c.id);
      alert(
        `Invio completato: ${s.sent} inviati, ${s.failed} falliti, ${s.skipped} skippati.`
      );
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore invio");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campagne di massa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaigns.length} campagne totali · invia offerte e aggiornamenti.
          </p>
        </div>
        <Link href="/marketing/campagne/nuova">
          <Button>
            <Plus className="h-4 w-4" /> Nuova campagna
          </Button>
        </Link>
      </header>

      {campaigns.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessuna campagna</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crea la tua prima campagna per inviare un messaggio a un gruppo di clienti.
          </p>
          <Link href="/marketing/campagne/nuova" className="inline-block mt-4">
            <Button>
              <Plus className="h-4 w-4" /> Nuova campagna
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Canale</th>
                  <th className="px-4 py-3 text-left font-medium">Target</th>
                  <th className="px-4 py-3 text-left font-medium">Programmata</th>
                  <th className="px-4 py-3 text-center font-medium">Stato</th>
                  <th className="px-4 py-3 text-center font-medium">Inviati</th>
                  <th className="px-4 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {channelIcon(c.canale)}
                        <span className="uppercase text-xs text-muted-foreground">
                          {c.canale}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {SEGMENT_LABELS[c.segmentoTarget ?? ""]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {c.scheduleAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(c.scheduleAt).toLocaleString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{stateBadge(c.stato)}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          {c.sentCount}
                        </span>
                        {c.errorCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <AlertCircle className="h-3 w-3" />
                            {c.errorCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {c.stato !== "inviata" && c.stato !== "in_invio" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendNow(c)}
                            disabled={sendingId === c.id}
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            {sendingId === c.id ? "…" : "Invia"}
                          </Button>
                        )}
                        {c.stato !== "inviata" && c.stato !== "in_invio" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(c)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(c)}
                          disabled={c.stato === "in_invio" || c.stato === "inviata"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <EditModal
          campaign={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function EditModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: campaign.nome,
    canale: campaign.canale,
    segmentoTarget: campaign.segmentoTarget ?? "",
    subject: campaign.subject ?? "",
    body: campaign.body,
    scheduleAt: campaign.scheduleAt ? campaign.scheduleAt.slice(0, 16) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await updateCampaign(campaign.id, {
          nome: form.nome,
          canale: form.canale,
          segmentoTarget: form.segmentoTarget || null,
          subject: form.subject || null,
          body: form.body,
          scheduleAt: form.scheduleAt ? new Date(form.scheduleAt).toISOString() : null,
        });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Modifica campagna</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="camp-nome">Nome *</Label>
              <Input
                id="camp-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="camp-canale">Canale *</Label>
                <Select
                  id="camp-canale"
                  value={form.canale}
                  onChange={(e) =>
                    setForm({ ...form, canale: e.target.value as Campaign["canale"] })
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="camp-seg">Segmento target</Label>
                <Select
                  id="camp-seg"
                  value={form.segmentoTarget}
                  onChange={(e) => setForm({ ...form, segmentoTarget: e.target.value })}
                >
                  <option value="">Tutti i clienti</option>
                  <option value="lead">Lead</option>
                  <option value="nuova">Nuove</option>
                  <option value="lotina">Lotine</option>
                  <option value="inattiva">Inattive</option>
                  <option value="vip">VIP</option>
                </Select>
              </div>
            </div>
            {form.canale === "email" && (
              <div>
                <Label htmlFor="camp-subj">Oggetto email</Label>
                <Input
                  id="camp-subj"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="camp-body">Testo *</Label>
              <Textarea
                id="camp-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={6}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Puoi usare {`{{nome}}`} e {`{{cognome}}`} per personalizzare.
              </p>
            </div>
            <div>
              <Label htmlFor="camp-sched">Programmazione (opzionale)</Label>
              <Input
                id="camp-sched"
                type="datetime-local"
                value={form.scheduleAt}
                onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
