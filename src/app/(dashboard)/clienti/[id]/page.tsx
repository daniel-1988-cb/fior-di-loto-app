export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Ban,
} from "lucide-react";
import {
  getClient,
  getClientAppointments,
  getClientProducts,
  getClientProfileSummary,
  getClientTransactions,
} from "@/lib/actions/clients";
import { formatPhone, formatDate } from "@/lib/utils";
import { ClientProfileTabs } from "@/components/clienti/client-profile-tabs";
import { PanoramicaTab } from "@/components/clienti/panoramica-tab";
import { AppuntamentiTab } from "@/components/clienti/appuntamenti-tab";
import { VenditeTab } from "@/components/clienti/vendite-tab";
import { ArticoliTab } from "@/components/clienti/articoli-tab";
import { ProfileHeaderActions } from "@/components/clienti/profile-header-actions";

function getSegmentoStyle(segmento: string) {
  switch (segmento) {
    case "lotina": return "bg-gold/20 text-gold-dark";
    case "vip": return "bg-rose/20 text-rose-dark";
    case "nuova": return "bg-success/20 text-success";
    case "lead": return "bg-info/20 text-info";
    case "inattiva": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function getSegmentoLabel(segmento: string) {
  switch (segmento) {
    case "lotina": return "Lotina";
    case "vip": return "VIP";
    case "nuova": return "Nuova";
    case "lead": return "Lead";
    case "inattiva": return "Inattiva";
    default: return segmento;
  }
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const [summary, appointments, transactions, products] = await Promise.all([
    getClientProfileSummary(id),
    getClientAppointments(id),
    getClientTransactions(id),
    getClientProducts(id),
  ]);

  const fullName = `${client.nome} ${client.cognome}`.trim();
  const initials = `${client.nome?.[0] ?? ""}${client.cognome?.[0] ?? ""}`.toUpperCase() || "?";
  const createdFormatted = client.created_at
    ? new Date(client.created_at).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/clienti"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai clienti
        </Link>
      </div>

      {/* Warning banners */}
      {client.blocked && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-400">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Cliente bloccato — non può essere aggiunto a nuovi appuntamenti.</span>
        </div>
      )}
      {client.avviso_personale && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-wrap">{client.avviso_personale}</span>
        </div>
      )}

      {/* 3-col Fresha layout:
          profile (left) | tab nav + content (right, handled by ClientProfileTabs) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left column: profile */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose/10">
                <span className="text-3xl font-semibold text-rose">{initials}</span>
              </div>
              <h1 className="mt-4 text-xl font-semibold text-brown">{fullName}</h1>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${getSegmentoStyle(client.segmento)}`}
              >
                {getSegmentoLabel(client.segmento)}
              </span>

              <div className="mt-4 w-full space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${client.email}`}
                      className="truncate text-brown hover:text-rose"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                {client.telefono && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a
                      href={`tel:+39${client.telefono}`}
                      className="text-brown hover:text-rose"
                    >
                      {formatPhone(client.telefono)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Actions — client island for interactive Attività menu */}
            <ProfileHeaderActions client={client} />
          </div>

          {/* Dati base */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-brown">Informazioni</h2>
            <dl className="space-y-3 text-sm">
              <InfoRow
                icon={<UserIcon className="h-4 w-4 text-muted-foreground" />}
                label="Pronome"
                value="—"
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                label="Data di nascita"
                value={client.data_nascita ? formatDate(client.data_nascita) : "—"}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                label="Creato il"
                value={createdFormatted}
              />
            </dl>
          </div>
        </aside>

        {/* Right column: tabs (nav + content) */}
        <section>
          <ClientProfileTabs
            editHref={`/clienti/${client.id}/modifica`}
            counts={{
              appuntamenti: summary.appuntamentiTotali,
              vendite: summary.venditeCount,
              articoli: summary.articoliCount,
            }}
            contents={{
              panoramica: <PanoramicaTab summary={summary} />,
              appuntamenti: <AppuntamentiTab appointments={appointments} />,
              vendite: (
                <VenditeTab
                  transactions={transactions.map((t) => ({
                    id: t.id as string,
                    data: t.data as string,
                    descrizione: (t.descrizione as string | null) ?? null,
                    importo: Number(t.importo),
                    metodo_pagamento: (t.metodo_pagamento as string | null) ?? null,
                    categoria: (t.categoria as string | null) ?? null,
                  }))}
                />
              ),
              articoli: <ArticoliTab products={products} />,
            }}
          />
        </section>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm text-brown">{value}</dd>
      </div>
    </div>
  );
}
