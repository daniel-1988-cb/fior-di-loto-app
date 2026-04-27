"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { Card, Button, Input, Textarea, Label, Select } from "@/components/ui";
import {
  CatalogoListView,
  type CatalogoItem,
} from "@/components/catalogo/catalogo-list-view";
import {
  createService,
  updateService,
  deleteService,
} from "@/lib/actions/services";

type Service = {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string | null;
  durata: number;
  prezzo: number;
  attivo: boolean;
};

type FormState = {
  nome: string;
  categoria: string;
  descrizione: string;
  durata: string;
  prezzo: string;
};

const CATEGORIE = [
  { value: "viso", label: "Viso" },
  { value: "corpo", label: "Corpo" },
  { value: "massaggi", label: "Massaggi" },
  { value: "laser", label: "Laser" },
  { value: "spa", label: "Spa" },
] as const;

const EMPTY_FORM: FormState = {
  nome: "",
  categoria: "viso",
  descrizione: "",
  durata: "",
  prezzo: "",
};

function toItem(s: Service): CatalogoItem {
  return {
    id: s.id,
    nome: s.nome,
    meta: `${s.durata} min`,
    prezzo: Number(s.prezzo),
    attivo: s.attivo,
    badges: [{ label: s.categoria, variant: "outline" }],
  };
}

export function ServiziClient({ services }: { services: Service[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditing("new");
  }

  function openEdit(item: CatalogoItem) {
    const s = services.find((x) => x.id === item.id);
    if (!s) return;
    setForm({
      nome: s.nome,
      categoria: s.categoria,
      descrizione: s.descrizione ?? "",
      durata: String(s.durata),
      prezzo: String(s.prezzo),
    });
    setError(null);
    setEditing(s.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const durata = parseInt(form.durata, 10);
    const prezzo = parseFloat(form.prezzo);
    if (!form.nome.trim()) return setError("Nome obbligatorio");
    if (!Number.isInteger(durata) || durata <= 0)
      return setError("Durata deve essere un intero positivo (minuti)");
    if (isNaN(prezzo) || prezzo <= 0)
      return setError("Prezzo deve essere maggiore di zero");

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      descrizione: form.descrizione.trim() || undefined,
      durata,
      prezzo,
    };

    startTransition(async () => {
      try {
        if (editing === "new") {
          await createService(payload);
        } else if (editing) {
          await updateService(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  async function handleDelete(item: CatalogoItem) {
    try {
      await deleteService(item.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Errore eliminazione");
    }
  }

  const items = services.map(toItem);

  return (
    <>
      <CatalogoListView
        items={items}
        title="Elenco servizi"
        subtitle={`${services.filter((s) => s.attivo).length} attivi su ${services.length} totali · gestisci prezzo, durata e categoria.`}
        searchPlaceholder="Cerca servizio..."
        newButtonLabel="Nuovo servizio"
        emptyMessage="Ancora nessun servizio in catalogo."
        emptyIcon={<Scissors className="h-6 w-6" />}
        onNew={openNew}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {editing && (
        <FormModal
          isNew={editing === "new"}
          form={form}
          setForm={setForm}
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
  onClose,
  onSubmit,
  error,
  pending,
}: {
  isNew: boolean;
  form: FormState;
  setForm: (f: FormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {isNew ? "Nuovo servizio" : "Modifica servizio"}
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="svc-nome">Nome *</Label>
              <Input
                id="svc-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Trattamento viso idratante"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="svc-cat">Categoria *</Label>
                <Select
                  id="svc-cat"
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                >
                  {CATEGORIE.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="svc-durata">Durata (min) *</Label>
                <Input
                  id="svc-durata"
                  type="number"
                  min="1"
                  step="5"
                  value={form.durata}
                  onChange={(e) =>
                    setForm({ ...form, durata: e.target.value })
                  }
                  placeholder="60"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="svc-prezzo">Prezzo (€) *</Label>
              <Input
                id="svc-prezzo"
                type="number"
                min="0.01"
                step="0.01"
                value={form.prezzo}
                onChange={(e) => setForm({ ...form, prezzo: e.target.value })}
                placeholder="50.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="svc-descr">Descrizione del trattamento</Label>
              <Textarea
                id="svc-descr"
                value={form.descrizione}
                onChange={(e) =>
                  setForm({ ...form, descrizione: e.target.value })
                }
                rows={4}
                maxLength={1000}
                placeholder="Es: pulizia viso completa con detergente, scrub enzimatico, estrazione comedoni, maschera personalizzata e massaggio finale. Adatta a tutti i tipi di pelle. Sconsigliata in caso di acne attiva grave."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cosa include il trattamento, controindicazioni, indicazioni utili. Il bot Marialucia userà questa descrizione per rispondere ai clienti che chiedono info su WhatsApp.
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
