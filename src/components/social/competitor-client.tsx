"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ExternalLink, TrendingUp, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  addCompetitorUpdate,
  getCompetitorUpdates,
} from "@/lib/actions/competitors";
import type { Competitor, CompetitorUpdate } from "@/lib/actions/competitors";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const inputClass =
  "w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

function engagementBadge(rate: number) {
  if (rate >= 5) return "bg-success/10 text-success";
  if (rate >= 2) return "bg-gold/20 text-gold-dark";
  return "bg-red-100 text-red-600";
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function getPiattaformaLabel(p: string) {
  switch (p) {
    case "instagram": return "Instagram";
    case "facebook": return "Facebook";
    case "tiktok": return "TikTok";
    default: return p;
  }
}

// Add Competitor Modal
function AddCompetitorModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    nome: "",
    handle: "",
    piattaforma: "instagram",
    url: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createCompetitor({
          nome: form.nome,
          handle: form.handle,
          piattaforma: form.piattaforma,
          url: form.url || undefined,
          note: form.note || undefined,
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-brown">
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 font-semibold text-brown">Aggiungi Concorrente</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-brown">Nome *</label>
            <input name="nome" value={form.nome} onChange={handleChange} required className={inputClass} placeholder="Es. Centro Estetico Roma" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown">Handle *</label>
            <input name="handle" value={form.handle} onChange={handleChange} required className={inputClass} placeholder="@handle" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown">Piattaforma *</label>
            <select name="piattaforma" value={form.piattaforma} onChange={handleChange} className={inputClass}>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown">URL Profilo</label>
            <input name="url" value={form.url} onChange={handleChange} className={inputClass} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brown">Note</label>
            <textarea name="note" value={form.note} onChange={handleChange} className={inputClass} rows={2} placeholder="Note opzionali..." />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
            >
              {isPending ? "Salvataggio..." : "Aggiungi"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Update Metrics inline form
function UpdateMetricsForm({
  competitor,
  onClose,
}: {
  competitor: Competitor;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    follower: competitor.follower?.toString() || "",
    post_totali: competitor.post_totali?.toString() || "",
    freq_settimanale: competitor.freq_settimanale?.toString() || "",
    engagement_rate: competitor.engagement_rate?.toString() || "",
    note: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addCompetitorUpdate(competitor.id, {
        follower: form.follower ? Number(form.follower) : undefined,
        post_totali: form.post_totali ? Number(form.post_totali) : undefined,
        freq_settimanale: form.freq_settimanale ? Number(form.freq_settimanale) : undefined,
        engagement_rate: form.engagement_rate ? Number(form.engagement_rate) : undefined,
        note: form.note || undefined,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border bg-cream-dark/30 p-3">
      <p className="mb-2 text-xs font-semibold text-brown">Aggiorna Metriche</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-xs text-muted-foreground">Follower</label>
          <input name="follower" type="number" value={form.follower} onChange={handleChange} className={inputClass} min="0" />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-muted-foreground">Post Totali</label>
          <input name="post_totali" type="number" value={form.post_totali} onChange={handleChange} className={inputClass} min="0" />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-muted-foreground">Freq/Settimana</label>
          <input name="freq_settimanale" type="number" step="0.1" value={form.freq_settimanale} onChange={handleChange} className={inputClass} min="0" />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-muted-foreground">Engagement %</label>
          <input name="engagement_rate" type="number" step="0.01" value={form.engagement_rate} onChange={handleChange} className={inputClass} min="0" />
        </div>
      </div>
      <div className="mt-2">
        <label className="mb-0.5 block text-xs text-muted-foreground">Note</label>
        <input name="note" value={form.note} onChange={handleChange} className={inputClass} placeholder="Osservazioni..." />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-rose px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-dark disabled:opacity-50"
        >
          {isPending ? "Salvo..." : "Salva"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-brown hover:bg-cream-dark"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

// Trend chart for a competitor
function TrendChart({ competitorId }: { competitorId: string }) {
  const [updates, setUpdates] = useState<CompetitorUpdate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadUpdates() {
    if (updates !== null) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const data = await getCompetitorUpdates(competitorId);
      setUpdates(data);
      setOpen(true);
    } catch {
      setUpdates([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const chartData = (updates || []).map((u) => ({
    data: u.data_rilevazione,
    follower: u.follower || 0,
  }));

  return (
    <div>
      <button
        onClick={loadUpdates}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-brown hover:bg-cream-dark"
      >
        <TrendingUp className="h-3 w-3" />
        {loading ? "..." : "Trend"}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && updates !== null && (
        <div className="mt-2">
          {chartData.length < 2 ? (
            <p className="text-xs text-muted-foreground">
              {chartData.length === 0
                ? "Nessun dato storico. Aggiorna le metriche per vedere il trend."
                : "Aggiungi almeno 2 rilevazioni per vedere il grafico."}
            </p>
          ) : (
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={40} />
                  <Tooltip
                    formatter={(v) => [formatNumber(Number(v)), "Follower"]}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="follower" fill="var(--color-rose, #e11d48)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Competitor row
function CompetitorRow({ competitor }: { competitor: Competitor }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMetricsForm, setShowMetricsForm] = useState(false);

  function handleDelete() {
    if (!confirm(`Eliminare ${competitor.nome}?`)) return;
    startTransition(async () => {
      await deleteCompetitor(competitor.id);
      router.refresh();
    });
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity ${isPending ? "opacity-50" : ""}`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Name + handle */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brown">{competitor.nome}</span>
            <span className="text-sm text-muted-foreground">@{competitor.handle}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {getPiattaformaLabel(competitor.piattaforma)}
            </span>
          </div>
          {competitor.note && (
            <p className="mt-0.5 text-xs text-muted-foreground">{competitor.note}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {competitor.url && (
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-brown hover:bg-cream-dark"
            >
              <ExternalLink className="h-3 w-3" />
              Profilo
            </a>
          )}
          <button
            onClick={() => setShowMetricsForm((v) => !v)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-brown hover:bg-cream-dark"
          >
            Aggiorna metriche
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-cream-dark/40 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Follower</p>
          <p className="font-semibold text-brown">{formatNumber(competitor.follower || 0)}</p>
        </div>
        <div className="rounded-lg bg-cream-dark/40 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Post Totali</p>
          <p className="font-semibold text-brown">{formatNumber(competitor.post_totali || 0)}</p>
        </div>
        <div className="rounded-lg bg-cream-dark/40 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Freq/Settimana</p>
          <p className="font-semibold text-brown">{(competitor.freq_settimanale || 0).toFixed(1)}x</p>
        </div>
        <div className={`rounded-lg px-3 py-2 text-center ${engagementBadge(competitor.engagement_rate || 0)}`}>
          <p className="text-xs">Engagement</p>
          <p className="font-semibold">{(competitor.engagement_rate || 0).toFixed(2)}%</p>
        </div>
      </div>

      {competitor.ultimo_aggiornamento && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ultimo aggiornamento: {new Intl.DateTimeFormat("it-IT").format(new Date(competitor.ultimo_aggiornamento + "T00:00:00"))}
        </p>
      )}

      {/* Metrics form */}
      {showMetricsForm && (
        <UpdateMetricsForm competitor={competitor} onClose={() => setShowMetricsForm(false)} />
      )}

      {/* Trend chart */}
      <div className="mt-3">
        <TrendChart competitorId={competitor.id} />
      </div>
    </div>
  );
}

export function CompetitorClient({ initialCompetitors }: { initialCompetitors: Competitor[] }) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{initialCompetitors.length} competitor monitorati</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
        >
          <Plus className="h-4 w-4" />
          Aggiungi Concorrente
        </button>
      </div>

      {/* Competitor list */}
      {initialCompetitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="mb-2 font-medium text-brown">Nessun concorrente aggiunto</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Aggiungi i tuoi competitor per monitorare follower, engagement e trend.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
          >
            <Plus className="h-4 w-4" />
            Aggiungi il primo concorrente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {initialCompetitors.map((c) => (
            <CompetitorRow key={c.id} competitor={c} />
          ))}
        </div>
      )}

      {showAddModal && <AddCompetitorModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
