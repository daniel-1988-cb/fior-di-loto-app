"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Card, Button, Input, Textarea, Label } from "@/components/ui";
import {
  CatalogoListView,
  type CatalogoItem,
} from "@/components/catalogo/catalogo-list-view";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionAttivo,
  type Subscription,
} from "@/lib/actions/subscriptions";

type ServiceOption = { id: string; nome: string; categoria: string };

type FormState = {
  nome: string;
  descrizione: string;
  seduteTotali: string;
  validitaGiorni: string;
  prezzo: string;
  serviziInclusi: Set<string>;
};

const EMPTY_FORM: FormState = {
  nome: "",
  descrizione: "",
  seduteTotali: "",
  validitaGiorni: "",
  prezzo: "",
  serviziInclusi: new Set(),
};

function toItem(s: Subscription): CatalogoItem {
  const pieces: string[] = [`${s.seduteTotali} sedute`];
  if (s.validitaGiorni) pieces.push(`valido ${s.validitaGiorni}gg`);
  else pieces.push("validità illimitata");
  if (s.serviziInclusi.length > 0)
    pieces.push(`${s.serviziInclusi.length} servizi inclusi`);

  return {
    id: s.id,
    nome: s.nome,
    meta: pieces.join(" · "),
    prezzo: s.prezzo,
    attivo: s.attivo,
  };
}

export function AbbonamentiClient({
  subscriptions,
  services,
}: {
  subscriptions: Subscription[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm({ ...EMPTY_FORM, serviziInclusi: new Set() });
    setError(null);
    setEditing("new");
  }

  function openEdit(item: CatalogoItem) {
    const s = subscriptions.find((x) => x.id === item.id);
    if (!s) return;
    setForm({
      nome: s.nome,
      descrizione: s.descrizione ?? "",
      seduteTotali: String(s.seduteTotali),
      validitaGiorni: s.validitaGiorni ? String(s.validitaGiorni) : "",
      prezzo: String(s.prezzo),
      serviziInclusi: new Set(s.serviziInclusi),
    });
    setError(null);
    setEditing(s.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  function toggleServizio(id: string) {
    setForm((prev) => {
      const next = new Set(prev.serviziInclusi);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, serviziInclusi: next };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const seduteTotali = parseInt(form.seduteTotali, 10);
    const prezzo = parseFloat(form.prezzo);
    const validitaGiorni = form.validitaGiorni
      ? parseInt(form.validitaGiorni, 10)
      : null;

    if (!form.nome.trim()) return setError("Nome obbligatorio");
    if (!Number.isInteger(seduteTotali) || seduteTotali <= 0)
      return setError("Sedute totali deve essere un intero positivo");
    if (isNaN(prezzo) || prezzo < 0)
      return setError("Prezzo deve essere >= 0");
    if (
      validitaGiorni !== null &&
      (!Number.isInteger(validitaGiorni) || validitaGiorni <= 0)
    ) {
      return setError(
        "Validità in giorni deve essere un intero positivo, o vuoto per illimitato"
      );
    }

    const payload = {
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim() || null,
      seduteTotali,
      validitaGiorni,
      prezzo,
      serviziInclusi: Array.from(form.serviziInclusi),
    };

    startTransition(async () => {
      try {
        if (editing === "new") {
          await createSubscription(payload);
        } else if (editing) {
          await updateSubscription(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  async function handleDelete(item: CatalogoItem) {
    const res = await deleteSubscription(item.id);
    if (!res.ok && res.error !== "archived") {
      alert(res.error ?? "Errore eliminazione");
      return;
    }
    if (res.error === "archived") {
      alert(
        "Questo abbonamento è già stato venduto: archiviato (attivo=false) invece di eliminato."
      );
    }
    router.refresh();
  }

  async function handleToggle(item: CatalogoItem, next: boolean) {
    await toggleSubscriptionAttivo(item.id, next);
    router.refresh();
  }

  const items = subscriptions.map(toItem);

  return (
    <>
      <CatalogoListView
        items={items}
        title="Abbonamenti"
        subtitle={`${subscriptions.filter((s) => s.attivo).length} attivi · pacchetti sedute + servizi inclusi.`}
        searchPlaceholder="Cerca abbonamento..."
        newButtonLabel="Nuovo abbonamento"
        emptyMessage="Nessun abbonamento nel catalogo."
        emptyIcon={<CreditCard className="h-6 w-6" />}
        onNew={openNew}
        onEdit={openEdit}
        onToggleAttivo={handleToggle}
        onDelete={handleDelete}
      />

      {editing && (
        <FormModal
          isNew={editing === "new"}
          form={form}
          setForm={setForm}
          toggleServizio={toggleServizio}
          services={services}
          onClose={close}
          onSubmit={submit}
          error={error}
          pending={isPending}
        />
      )}
    </>
  );
}

function FormModal({
  isNew,
  form,
  setForm,
  toggleServizio,
  services,
  onClose,
  onSubmit,
  error,
  pending,
}: {
  isNew: boolean;
  form: FormState;
  setForm: (f: FormState) => void;
  toggleServizio: (id: string) => void;
  services: ServiceOption[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  pending: boolean;
}) {
  // Group services by categoria
  const grouped = services.reduce<Record<string, ServiceOption[]>>((acc, s) => {
    (acc[s.categoria] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {isNew ? "Nuovo abbonamento" : "Modifica abbonamento"}
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="sub-nome">Nome *</Label>
              <Input
                id="sub-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Pacchetto Rinascita 10 sedute"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="sub-sedute">Sedute totali *</Label>
                <Input
                  id="sub-sedute"
                  type="number"
                  min="1"
                  step="1"
                  value={form.seduteTotali}
                  onChange={(e) =>
                    setForm({ ...form, seduteTotali: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="sub-validita">Validità (giorni)</Label>
                <Input
                  id="sub-validita"
                  type="number"
                  min="1"
                  step="1"
                  value={form.validitaGiorni}
                  onChange={(e) =>
                    setForm({ ...form, validitaGiorni: e.target.value })
                  }
                  placeholder="Vuoto = illimitato"
                />
              </div>
              <div>
                <Label htmlFor="sub-prezzo">Prezzo (€) *</Label>
                <Input
                  id="sub-prezzo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prezzo}
                  onChange={(e) =>
                    setForm({ ...form, prezzo: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sub-descr">Descrizione</Label>
              <Textarea
                id="sub-descr"
                value={form.descrizione}
                onChange={(e) =>
                  setForm({ ...form, descrizione: e.target.value })
                }
                rows={2}
              />
            </div>

            <div>
              <Label>Servizi inclusi ({form.serviziInclusi.size})</Label>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-3">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessun servizio disponibile. Crea prima i servizi nel
                    catalogo.
                  </p>
                ) : (
                  Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="mb-3 last:mb-0">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {cat}
                      </p>
                      <div className="space-y-1">
                        {items.map((s) => (
                          <label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={form.serviziInclusi.has(s.id)}
                              onChange={() => toggleServizio(s.id)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <span>{s.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
              onClick={onClose}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
