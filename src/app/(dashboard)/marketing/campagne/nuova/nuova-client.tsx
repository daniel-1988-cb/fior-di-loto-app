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
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Mail,
  Smartphone,
  Send,
  Clock,
  Check,
} from "lucide-react";
import { createCampaign } from "@/lib/actions/campaigns";

type Canale = "whatsapp" | "email" | "sms";

type SegmentCount = { segmento: string; count: number };

const SEGMENT_LABELS: Record<string, string> = {
  "": "Tutti i clienti",
  lead: "Lead",
  nuova: "Nuove",
  lotina: "Lotine",
  inattiva: "Inattive",
  vip: "VIP",
};

export function NuovaCampagnaClient({
  segmentCounts,
  totalClients,
}: {
  segmentCounts: SegmentCount[];
  totalClients: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [canale, setCanale] = useState<Canale>("whatsapp");
  const [segmentoTarget, setSegmentoTarget] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = useState("");

  const recipientCount =
    segmentoTarget === ""
      ? totalClients
      : segmentCounts.find((s) => s.segmento === segmentoTarget)?.count ?? 0;

  function goStep2() {
    setError(null);
    if (!nome.trim()) return setError("Inserisci un nome");
    if (!canale) return setError("Scegli un canale");
    setStep(2);
  }

  function goStep3() {
    setError(null);
    if (!body.trim()) return setError("Inserisci il testo del messaggio");
    if (canale === "email" && !subject.trim())
      return setError("Inserisci l'oggetto email");
    setStep(3);
  }

  function submit() {
    setError(null);
    if (scheduleMode === "later" && !scheduleAt)
      return setError("Seleziona data e ora della programmazione");

    const payload = {
      nome: nome.trim(),
      canale,
      segmentoTarget: segmentoTarget || null,
      subject: canale === "email" ? subject.trim() || null : null,
      body: body.trim(),
      scheduleAt:
        scheduleMode === "later" && scheduleAt
          ? new Date(scheduleAt).toISOString()
          : null,
      stato: scheduleMode === "now" ? "bozza" : undefined,
    };

    start(async () => {
      try {
        await createCampaign(payload);
        router.push("/marketing/campagne");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore creazione");
      }
    });
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuova campagna</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            3 passaggi per programmare o inviare una campagna.
          </p>
        </div>
        <Link href="/marketing/campagne">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Torna alle campagne
          </Button>
        </Link>
      </header>

      <div className="mb-6 flex items-center gap-3">
        <StepPill n={1} label="Base" active={step === 1} done={step > 1} />
        <div className="h-px w-8 bg-border" />
        <StepPill n={2} label="Target & testo" active={step === 2} done={step > 2} />
        <div className="h-px w-8 bg-border" />
        <StepPill n={3} label="Invio" active={step === 3} done={false} />
      </div>

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="new-nome">Nome campagna *</Label>
              <Input
                id="new-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Es. Promo primavera Lotine"
                required
              />
            </div>
            <div>
              <Label>Canale *</Label>
              <div className="grid grid-cols-3 gap-3">
                <ChannelCard
                  icon={MessageCircle}
                  label="WhatsApp"
                  value="whatsapp"
                  selected={canale === "whatsapp"}
                  onSelect={setCanale}
                />
                <ChannelCard
                  icon={Mail}
                  label="Email"
                  value="email"
                  selected={canale === "email"}
                  onSelect={setCanale}
                />
                <ChannelCard
                  icon={Smartphone}
                  label="SMS"
                  value="sms"
                  selected={canale === "sms"}
                  onSelect={setCanale}
                  disabled
                  hint="Gateway non ancora collegato"
                />
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end">
              <Button onClick={goStep2}>
                Avanti <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="new-seg">Segmento target</Label>
              <Select
                id="new-seg"
                value={segmentoTarget}
                onChange={(e) => setSegmentoTarget(e.target.value)}
              >
                <option value="">Tutti i clienti ({totalClients})</option>
                {segmentCounts.map((s) => (
                  <option key={s.segmento} value={s.segmento}>
                    {SEGMENT_LABELS[s.segmento]} ({s.count})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Destinatari stimati: <strong>{recipientCount}</strong>
              </p>
            </div>
            {canale === "email" && (
              <div>
                <Label htmlFor="new-subj">Oggetto email *</Label>
                <Input
                  id="new-subj"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Es. Un regalo per te"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="new-body">Testo messaggio *</Label>
              <Textarea
                id="new-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Ciao {{nome}}, ..."
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Personalizza con {`{{nome}}`} e {`{{cognome}}`}.
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={goStep3}>
                Avanti <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border p-4 text-sm">
              <p>
                <strong>{nome}</strong>
              </p>
              <p className="mt-1 text-muted-foreground">
                Canale: <Badge variant="outline">{canale}</Badge> · Destinatari:{" "}
                <strong>{recipientCount}</strong> ·{" "}
                {SEGMENT_LABELS[segmentoTarget] ?? "Tutti"}
              </p>
            </div>
            <div>
              <Label>Quando inviare</Label>
              <div className="grid grid-cols-2 gap-3">
                <ScheduleCard
                  icon={Send}
                  label="Salva come bozza"
                  desc="Puoi inviarla manualmente in seguito."
                  selected={scheduleMode === "now"}
                  onSelect={() => setScheduleMode("now")}
                />
                <ScheduleCard
                  icon={Clock}
                  label="Programma"
                  desc="Il cron la invierà automaticamente."
                  selected={scheduleMode === "later"}
                  onSelect={() => setScheduleMode("later")}
                />
              </div>
            </div>
            {scheduleMode === "later" && (
              <div>
                <Label htmlFor="new-sched">Data e ora *</Label>
                <Input
                  id="new-sched"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  required
                />
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={pending}>
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Creazione…" : "Crea campagna"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function StepPill({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium " +
        (active
          ? "bg-primary text-primary-foreground"
          : done
            ? "bg-success/15 text-success"
            : "bg-muted text-muted-foreground")
      }
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-[10px]">
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      {label}
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  label,
  value,
  selected,
  onSelect,
  disabled,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: Canale;
  selected: boolean;
  onSelect: (v: Canale) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={
        "rounded-xl border p-4 text-left transition-colors " +
        (selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40") +
        (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
      }
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </button>
  );
}

function ScheduleCard({
  icon: Icon,
  label,
  desc,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "rounded-xl border p-4 text-left transition-colors cursor-pointer " +
        (selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")
      }
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
