"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Minus, Plus as PlusIcon, AlertTriangle } from "lucide-react";
import { Card, Button, Input, Textarea, Label } from "@/components/ui";
import {
  CatalogoListView,
  type CatalogoItem,
} from "@/components/catalogo/catalogo-list-view";
import { UploadProductImage } from "@/components/catalogo/upload-product-image";
import {
  createProduct,
  updateProduct,
  updateGiacenza,
} from "@/lib/actions/products";
import { useToast } from "@/lib/hooks/use-toast";

type Product = {
  id: string;
  nome: string;
  categoria: string | null;
  descrizione: string | null;
  prezzo: number;
  giacenza: number;
  soglia_alert: number | null;
  image_url: string | null;
  attivo: boolean;
};

type FormState = {
  nome: string;
  categoria: string;
  descrizione: string;
  prezzo: string;
  giacenza: string;
  sogliaAlert: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  categoria: "",
  descrizione: "",
  prezzo: "",
  giacenza: "0",
  sogliaAlert: "5",
};

function toItem(p: Product): CatalogoItem {
  const lowStock = p.giacenza <= (p.soglia_alert ?? 5);
  const badges: CatalogoItem["badges"] = [];
  if (p.categoria) badges.push({ label: p.categoria, variant: "outline" });
  badges.push({
    label: `Giacenza ${p.giacenza}`,
    variant: lowStock ? "warning" : "default",
  });
  if (p.giacenza <= 0) {
    badges.push({ label: "Esaurito", variant: "danger" });
  }
  return {
    id: p.id,
    nome: p.nome,
    meta: p.descrizione?.slice(0, 80) ?? null,
    prezzo: Number(p.prezzo),
    attivo: p.attivo,
    badges,
  };
}

export function ProdottiClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [giacenzaPendingId, setGiacenzaPendingId] = useState<string | null>(
    null
  );
  const toast = useToast();

  const lowStockCount = products.filter(
    (p) => p.attivo && p.giacenza <= (p.soglia_alert ?? 5)
  ).length;

  function openNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditing("new");
  }

  function openEdit(item: CatalogoItem) {
    const p = products.find((x) => x.id === item.id);
    if (!p) return;
    setForm({
      nome: p.nome,
      categoria: p.categoria ?? "",
      descrizione: p.descrizione ?? "",
      prezzo: String(p.prezzo),
      giacenza: String(p.giacenza),
      sogliaAlert: String(p.soglia_alert ?? 5),
    });
    setError(null);
    setEditing(p.id);
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const prezzo = parseFloat(form.prezzo);
    const giacenza = parseInt(form.giacenza, 10);
    const sogliaAlert = parseInt(form.sogliaAlert, 10);
    if (!form.nome.trim()) return setError("Nome obbligatorio");
    if (!form.categoria.trim()) return setError("Categoria obbligatoria");
    if (isNaN(prezzo) || prezzo < 0)
      return setError("Prezzo deve essere >= 0");
    if (!Number.isInteger(giacenza) || giacenza < 0)
      return setError("Giacenza deve essere un intero >= 0");
    if (!Number.isInteger(sogliaAlert) || sogliaAlert < 0)
      return setError("Soglia alert deve essere un intero >= 0");

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria.trim(),
      descrizione: form.descrizione.trim() || undefined,
      prezzo,
      giacenza,
      sogliaAlert,
    };

    startTransition(async () => {
      try {
        if (editing === "new") {
          await createProduct(payload);
        } else if (editing) {
          await updateProduct(editing, payload);
        }
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore salvataggio");
      }
    });
  }

  async function adjustGiacenza(id: string, delta: number) {
    setGiacenzaPendingId(id);
    try {
      await updateGiacenza(id, delta);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore aggiornamento");
    } finally {
      setGiacenzaPendingId(null);
    }
  }

  const items = products.map(toItem);

  const statsCard =
    products.length > 0 ? (
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Totale prodotti
          </p>
          <p className="mt-1 text-2xl font-bold">{products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Attivi
          </p>
          <p className="mt-1 text-2xl font-bold">
            {products.filter((p) => p.attivo).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Scorte basse
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {lowStockCount}
          </p>
        </Card>
      </section>
    ) : null;

  return (
    <>
      <CatalogoListView
        items={items}
        title="Prodotti"
        subtitle={`${products.filter((p) => p.attivo).length} attivi · gestisci giacenza e soglia alert.`}
        searchPlaceholder="Cerca prodotto..."
        newButtonLabel="Nuovo prodotto"
        emptyMessage="Nessun prodotto in catalogo."
        emptyIcon={<Package className="h-6 w-6" />}
        onNew={openNew}
        onEdit={openEdit}
        headerExtra={statsCard}
      />

      {products.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Giacenza rapida</h2>
            <p className="text-xs text-muted-foreground">
              Correggi la scorta senza aprire il form completo.
            </p>
          </div>
          <div className="divide-y divide-border">
            {products
              .filter((p) => p.attivo)
              .map((p) => {
                const pending = giacenzaPendingId === p.id;
                const lowStock = p.giacenza <= (p.soglia_alert ?? 5);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Soglia alert: {p.soglia_alert ?? 5}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => adjustGiacenza(p.id, -1)}
                        disabled={pending || p.giacenza <= 0}
                        aria-label="Diminuisci giacenza"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span
                        className={`w-12 text-center font-semibold tabular-nums ${
                          lowStock ? "text-warning" : ""
                        }`}
                      >
                        {p.giacenza}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => adjustGiacenza(p.id, 1)}
                        disabled={pending}
                        aria-label="Aumenta giacenza"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {editing && (
        <FormModal
          isNew={editing === "new"}
          editingId={editing === "new" ? null : editing}
          initialImageUrl={
            editing !== "new"
              ? (products.find((p) => p.id === editing)?.image_url ?? null)
              : null
          }
          form={form}
          setForm={setForm}
          onClose={close}
          onSubmit={submit}
          onImageChange={() => router.refresh()}
          error={error}
          pending={isPending}
        />
      )}
    </>
  );
}

function FormModal({
  isNew,
  editingId,
  initialImageUrl,
  form,
  setForm,
  onClose,
  onSubmit,
  onImageChange,
  error,
  pending,
}: {
  isNew: boolean;
  editingId: string | null;
  initialImageUrl: string | null;
  form: FormState;
  setForm: (f: FormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageChange: () => void;
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
            {isNew ? "Nuovo prodotto" : "Modifica prodotto"}
          </h2>

          <div className="space-y-4">
            {!isNew && editingId && (
              <div>
                <Label>Immagine prodotto</Label>
                <UploadProductImage
                  productId={editingId}
                  initialUrl={initialImageUrl}
                  onChange={onImageChange}
                />
              </div>
            )}

            <div>
              <Label htmlFor="prod-nome">Nome *</Label>
              <Input
                id="prod-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Siero viso anti-età"
                required
              />
            </div>

            <div>
              <Label htmlFor="prod-cat">Categoria *</Label>
              <Input
                id="prod-cat"
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
                placeholder="Es. skincare, make-up, ricambi"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="prod-prezzo">Prezzo (€) *</Label>
                <Input
                  id="prod-prezzo"
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
              <div>
                <Label htmlFor="prod-giac">Giacenza *</Label>
                <Input
                  id="prod-giac"
                  type="number"
                  min="0"
                  step="1"
                  value={form.giacenza}
                  onChange={(e) =>
                    setForm({ ...form, giacenza: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="prod-soglia">Soglia alert</Label>
                <Input
                  id="prod-soglia"
                  type="number"
                  min="0"
                  step="1"
                  value={form.sogliaAlert}
                  onChange={(e) =>
                    setForm({ ...form, sogliaAlert: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="prod-descr">Descrizione</Label>
              <Textarea
                id="prod-descr"
                value={form.descrizione}
                onChange={(e) =>
                  setForm({ ...form, descrizione: e.target.value })
                }
                rows={3}
                placeholder="Note/dettagli prodotto..."
              />
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
