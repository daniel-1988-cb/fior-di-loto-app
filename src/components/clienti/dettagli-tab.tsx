import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatDate, formatPhone } from "@/lib/utils";

type ClientLike = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  data_nascita: string | null;
  indirizzo: string | null;
  note: string | null;
  allergie: string | null;
  patch_test: string | null;
  avviso_personale: string | null;
  segmento: string;
  blocked: boolean;
  tags: unknown;
  fonte: string | null;
  created_at: string;
  // Campi opzionali — non sempre presenti nei tipi generati
  lingua?: string | null;
  sesso?: string | null;
};

function coerceTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

const SEGMENTO_LABEL: Record<string, string> = {
  lotina: "Lotina",
  vip: "VIP",
  nuova: "Nuova",
  lead: "Lead",
  inattiva: "Inattiva",
};

const FONTE_LABEL: Record<string, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  passaparola: "Passaparola",
  meta_ads: "Meta Ads",
  walk_in: "Walk-in",
  altro: "Altro",
};

export function DettagliTab({
  client,
  editHref,
}: {
  client: ClientLike;
  editHref: string;
}) {
  const tags = coerceTags(client.tags);
  const createdFormatted = client.created_at
    ? formatDate(client.created_at)
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-brown">Dettagli cliente</h3>
        <Link
          href={editHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-brown transition-colors hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifica
        </Link>
      </div>

      <Section title="Anagrafica">
        <Row label="Nome" value={client.nome} />
        <Row label="Cognome" value={client.cognome} />
        <Row
          label="Data di nascita"
          value={client.data_nascita ? formatDate(client.data_nascita) : "—"}
        />
        {client.sesso && <Row label="Sesso" value={client.sesso} />}
        <Row label="Lingua" value={client.lingua || "Italiano"} />
      </Section>

      <Section title="Contatti">
        <Row label="Email" value={client.email || "—"} />
        <Row
          label="Telefono"
          value={client.telefono ? formatPhone(client.telefono) : "—"}
        />
        <Row label="Indirizzo" value={client.indirizzo || "—"} />
      </Section>

      <Section title="Note cliniche">
        <Row label="Allergie" value={client.allergie || "—"} multiline />
        <Row label="Patch test" value={client.patch_test || "—"} multiline />
        <Row
          label="Avviso personale"
          value={client.avviso_personale || "—"}
          multiline
        />
        <Row label="Note libere" value={client.note || "—"} multiline />
      </Section>

      <Section title="Tag">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun tag.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-rose/10 px-2.5 py-0.5 text-xs font-medium text-rose"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Stato">
        <Row
          label="Segmento"
          value={SEGMENTO_LABEL[client.segmento] || client.segmento}
        />
        <Row
          label="Bloccato"
          value={client.blocked ? "Sì" : "No"}
          highlight={client.blocked}
        />
        <Row
          label="Fonte"
          value={
            client.fonte ? FONTE_LABEL[client.fonte] || client.fonte : "—"
          }
        />
        <Row label="Creato il" value={createdFormatted} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="mb-4 text-sm font-semibold text-brown">{title}</h4>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {children}
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
  highlight,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={multiline ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${
          highlight ? "font-medium text-destructive" : "text-brown"
        } ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
