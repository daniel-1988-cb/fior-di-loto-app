"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Save, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Textarea,
  Label,
} from "@/components/ui";
import { upsertFollowUpRule } from "@/lib/actions/service-followups";
import {
  FOLLOWUP_OFFSETS,
  type FollowUpOffset,
  type FollowUpRule,
} from "@/lib/types/service-followup";

const DEFAULT_TEMPLATES: Record<FollowUpOffset, string> = {
  [-12]:
    "Ciao {nome} 🪷 domani alle {ora} ti aspetto per {servizio}. Rilassati, al resto pensiamo noi.",
  12: "Ciao {nome} 🪷 com'è andata? Bevi tanta acqua oggi, aiuta il drenaggio. Un abbraccio.",
  24: "Ciao {nome} 🪷 a 24h dal trattamento dovresti già sentire un effetto. Se hai dubbi scrivimi pure qui.",
};

const OFFSET_LABEL: Record<FollowUpOffset, { title: string; sub: string }> = {
  [-12]: {
    title: "12 ore prima",
    sub: "La sera prima del trattamento (es. appt domani 10:00 → invio oggi 22:00)",
  },
  12: {
    title: "12 ore dopo",
    sub: "Mezza giornata dopo il trattamento — check-in caldo",
  },
  24: {
    title: "24 ore dopo",
    sub: "Il giorno dopo — feedback / dubbi / risultati",
  },
};

type FormState = {
  attivo: boolean;
  template: string;
};

export function FollowUpDefaultsClient({
  defaults,
}: {
  defaults: FollowUpRule[];
}) {
  // Indicizza i default ricevuti per offset
  const defaultsByOffset = new Map<number, FollowUpRule>(
    defaults.map((d) => [d.offsetHours, d]),
  );

  const initialState: Record<number, FormState> = {};
  for (const offset of FOLLOWUP_OFFSETS) {
    const existing = defaultsByOffset.get(offset);
    initialState[offset] = {
      attivo: existing?.attivo ?? false,
      template:
        existing && existing.id
          ? existing.messageTemplate
          : DEFAULT_TEMPLATES[offset],
    };
  }

  const [state, setState] = useState<Record<number, FormState>>(initialState);
  const [pending, startTransition] = useTransition();
  const [savingOffset, setSavingOffset] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<
    Record<number, { ok: boolean; msg: string } | undefined>
  >({});

  function update(offset: number, patch: Partial<FormState>) {
    setState((prev) => ({
      ...prev,
      [offset]: { ...prev[offset], ...patch },
    }));
  }

  function save(offset: FollowUpOffset) {
    const cur = state[offset];
    setFeedback((f) => ({ ...f, [offset]: undefined }));
    setSavingOffset(offset);
    startTransition(async () => {
      const res = await upsertFollowUpRule({
        serviceId: null,
        offsetHours: offset,
        messageTemplate: cur.template,
        attivo: cur.attivo,
      });
      if (res.ok) {
        setFeedback((f) => ({
          ...f,
          [offset]: { ok: true, msg: "Salvato." },
        }));
      } else {
        setFeedback((f) => ({
          ...f,
          [offset]: { ok: false, msg: res.error },
        }));
      }
      setSavingOffset(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-amber-800 dark:text-amber-300">
          <p className="font-medium">
            Per inviare a clienti fuori sessione 24h serve un template Meta
            approvato.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Quando il cliente non ha scritto nelle ultime 24h, il bot manda il
            testo del template approvato (fisso). Le tue personalizzazioni qui
            partono solo se la sessione è aperta.
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Default globali
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Questi messaggi vengono inviati per tutti i servizi che non hanno un
          override specifico. Il reminder del giorno prima (-24h) è gestito
          separatamente dal cron già attivo: non lo ridefiniamo qui.
        </p>

        <div className="space-y-4">
          {FOLLOWUP_OFFSETS.map((offset) => {
            const cur = state[offset];
            const fb = feedback[offset];
            const label = OFFSET_LABEL[offset];
            const isSaving = pending && savingOffset === offset;
            return (
              <Card key={offset}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{label.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {label.sub}
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={cur.attivo}
                        onChange={(e) =>
                          update(offset, { attivo: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span>{cur.attivo ? "Attivo" : "Disattivo"}</span>
                    </label>
                  </div>

                  <Label htmlFor={`tpl-${offset}`}>Messaggio</Label>
                  <Textarea
                    id={`tpl-${offset}`}
                    value={cur.template}
                    onChange={(e) =>
                      update(offset, { template: e.target.value })
                    }
                    rows={3}
                    placeholder={DEFAULT_TEMPLATES[offset]}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Placeholder: <code>{"{nome}"}</code>{" "}
                    <code>{"{servizio}"}</code> <code>{"{ora}"}</code>{" "}
                    <code>{"{data}"}</code> <code>{"{salone}"}</code>
                  </p>

                  {fb && (
                    <p
                      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                        fb.ok
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {fb.msg}
                    </p>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => save(offset)}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Salvataggio..." : "Salva"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Override per servizio specifico
        </h2>
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Per modificare i follow-up di un singolo servizio (es. un messaggio
            diverso per la pressoterapia rispetto al massaggio), apri la scheda
            servizio.
            <div className="mt-3">
              <Link
                href="/catalogo/servizi"
                className="text-primary underline-offset-2 hover:underline"
              >
                Vai a Catalogo · Servizi →
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
