"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { Card, Button, Input, Textarea, Label } from "@/components/ui";
import {
  CatalogoListView,
  type CatalogoItem,
} from "@/components/catalogo/catalogo-list-view";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierAttivo,
  type Supplier,
} from "@/lib/actions/suppliers";

type FormState = {
  nome: string;
  partitaIva: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  indirizzo: string;
  referente: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  partitaIva: "",
  codiceFiscale: "",
  email: "",
  telefono: "",
  indirizzo: "",
  referente: "",
  note: "",
};

function toItem(s: Supplier): CatalogoItem {
  const pieces: string[] = [];
  if (s.partitaIva) pieces.push(`P.IVA ${s.partitaIva}`);
  if (s.telefono) pieces.push(s.telefono);
  if (s.email) pieces.push(s.email);
  if (s.referente) pieces.push(`ref. ${s.referente}`);

  return {
    id: s.id,
    nome: s.nome,
    meta: pieces.length > 0 ? pieces.join(" · ") : null,
    attivo: s.attivo,
  };
}

export function FornitoriClient({ suppliers }: { suppliers: Supplier[] }) {
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
    const s = suppliers.find((x) => x.id === item.id);
    if (!s) return;
    setForm({
      nome: s.nome,
      partitaIva: s.partitaIva ?? "",
      codiceFiscale: s.codiceFiscale ?? "",
      email: s.email ?? "",
      telefono: s.telefono ?? "",
      indirizzo: s.indirizzo ?? "",
      referente: s.referente ?? "",
      note: s.note ?? "",
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
    if (!form.nome.trim()) return setError("Nome obbligatorio");

    const payload = {
      nome: form.nome.trim(),
      partitaIva: form.partitaIva.trim() || null,
      codiceFiscale: form.codiceFiscale.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      indirizzo: form.indirizzo.trim() || null,
      referente: form.referente.trim() || null,
      note: form.note.trim() || null,
    };

    startTransition(async () => {
      try {
        if (editing === "new") {
          await createSupplier(payload);
        } else if (editing) {
          await updateSupplier(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  async function handleDelete(item: CatalogoItem) {
    const res = await deleteSupplier(item.id);
    if (!res.ok && res.error !== "archived") {
      alert(res.error ?? "Errore eliminazione");
      return;
    }
    if (res.error === "archived") {
      alert(
        "Questo fornitore ha ordini associati: archiviato (attivo=false) invece di eliminato."
      );
    }
    router.refresh();
  }

  async function handleToggle(item: CatalogoItem, next: boolean) {
    await toggleSupplierAttivo(item.id, next);
    router.refresh();
  }

  const items = suppliers.map(toItem);
  const attiviCount = suppliers.filter((s) => s.attivo).length;

  return (
    <>
      <CatalogoListView
        items={items}
        title="Fornitori"
        subtitle={`${attiviCount} attivi · anagrafica per ordini di stock.`}
        searchPlaceholder="Cerca fornitore..."
        newButtonLabel="Nuovo fornitore"
        emptyMessage="Nessun fornitore registrato."
        emptyIcon={<Store className="h-6 w-6" />}
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
        className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {isNew ? "Nuovo fornitore" : "Modifica fornitore"}
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="sup-nome">Nome / Ragione sociale *</Label>
              <Input
                id="sup-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Biolifa S.r.l."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sup-piva">Partita IVA</Label>
                <Input
                  id="sup-piva"
                  value={form.partitaIva}
                  onChange={(e) => setForm({ ...form, partitaIva: e.target.value })}
                  placeholder="IT01234567890"
                />
              </div>
              <div>
                <Label htmlFor="sup-cf">Codice fiscale</Label>
                <Input
                  id="sup-cf"
                  value={form.codiceFiscale}
                  onChange={(e) =>
                    setForm({ ...form, codiceFiscale: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sup-email">Email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ordini@fornitore.it"
                />
              </div>
              <div>
                <Label htmlFor="sup-tel">Telefono</Label>
                <Input
                  id="sup-tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="0123 456789"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sup-ref">Referente</Label>
              <Input
                id="sup-ref"
                value={form.referente}
                onChange={(e) => setForm({ ...form, referente: e.target.value })}
                placeholder="Nome cognome persona di contatto"
              />
            </div>

            <div>
              <Label htmlFor="sup-ind">Indirizzo</Label>
              <Textarea
                id="sup-ind"
                value={form.indirizzo}
                onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
                rows={2}
                placeholder="Via, CAP, Città"
              />
            </div>

            <div>
              <Label htmlFor="sup-note">Note</Label>
              <Textarea
                id="sup-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                placeholder="Condizioni pagamento, note interne..."
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
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
