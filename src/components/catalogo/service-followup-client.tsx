"use client";

import { useState, useTransition } from "react";
import { Save, AlertTriangle, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Textarea,
  Label,
} from "@/components/ui";
import {
  upsertFollowUpRule,
  deleteFollowUpRule,
} from "@/lib/actions/service-followups";
import {
  FOLLOWUP_OFFSETS,
  type FollowUpOffset,
  type FollowUpRule,
} from "@/lib/types/service-followup";

const OFFSET_LABEL: Record<FollowUpOffset, { title: string; sub: string }> = {
  [-12]: {
    title: "12 ore prima",
    sub: "La sera prima del trattamento",
  },
  12: {
    title: "12 ore dopo",
    sub: "Mezza giornata dopo il trattamento",
  },
  24: {
    title: "24 ore dopo",
    sub: "Il giorno dopo",
  },
};

type FormState = {
  // L'id della regola se esiste già nel DB (per delete)
  ruleId: string | null;
  attivo: boolean;
  template: string;
  globalFallback: string;
  globalAttivo: boolean;
};

export function ServiceFollowUpClient({
  serviceId,
  serviceRules,
  globalDefaults,
}: {
  serviceId: string;
  serviceRules: FollowUpRule[];
  globalDefaults: FollowUpRule[];
}) {
  const serviceByOffset = new Map(serviceRules.map((r) => [r.offsetHours, r]));
  const globalByOffset = new Map(globalDefaults.map((g) => [g.offsetHours, g]));

  const initial: Record<number, FormState> = {};
  for (const offset of FOLLOWUP_OFFSETS) {
    const svc = serviceByOffset.get(offset);
    const glb = globalByOffset.get(offset);
    initial[offset] = {
      ruleId: svc?.id ?? null,
      attivo: svc?.attivo ?? true,
      template: svc?.messageTemplate ?? "",
      globalFallback: glb?.messageTemplate ?? "",
      globalAttivo: Boolean(glb?.id) && (glb?.attivo ?? false),
    };
  }

  const [state, setState] = useState<Record<number, FormState>>(initial);
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
      // Se template vuoto e c'è una rule esistente → delete (ritorna a globale)
      if (cur.template.trim().length === 0) {
        if (cur.ruleId) {
          const res = await deleteFollowUpRule(cur.ruleId);
          if (res.ok) {
            update(offset, { ruleId: null });
            setFeedback((f) => ({
              ...f,
              [offset]: { ok: true, msg: "Override rimosso, torna al default globale." },
            }));
          } else {
            setFeedback((f) => ({
              ...f,
              [offset]: { ok: false, msg: res.error ?? "Errore" },
            }));
          }
        } else {
          setFeedback((f) => ({
            ...f,
            [offset]: {
              ok: true,
              msg: "Nessun override impostato — uso il default globale.",
            },
          }));
        }
        setSavingOffset(null);
        return;
      }

      const res = await upsertFollowUpRule({
        serviceId,
        offsetHours: offset,
        messageTemplate: cur.template,
        attivo: cur.attivo,
      });
      if (res.ok) {
        update(offset, { ruleId: res.rule.id });
        setFeedback((f) => ({
          ...f,
          [offset]: { ok: true, msg: "Override salvato." },
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
            Senza approvazione i messaggi falliscono. Chiedi a Daniel quando hai
            i template approvati.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {FOLLOWUP_OFFSETS.map((offset) => {
          const cur = state[offset];
          const fb = feedback[offset];
          const label = OFFSET_LABEL[offset];
          const isSaving = pending && savingOffset === offset;
          const hasOverride = Boolean(cur.ruleId);
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

                <Label htmlFor={`svc-tpl-${offset}`}>
                  Override per questo servizio (lascia vuoto per usare il default globale)
                </Label>
                <Textarea
                  id={`svc-tpl-${offset}`}
                  value={cur.template}
                  onChange={(e) =>
                    update(offset, { template: e.target.value })
                  }
                  rows={3}
                  placeholder={
                    cur.globalFallback ||
                    "Nessun default globale impostato per questo offset"
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Placeholder: <code>{"{nome}"}</code>{" "}
                  <code>{"{servizio}"}</code> <code>{"{ora}"}</code>{" "}
                  <code>{"{data}"}</code> <code>{"{salone}"}</code>
                </p>

                {cur.globalFallback && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">
                      Default globale
                      {cur.globalAttivo ? "" : " (disattivo)"}
                    </p>
                    <p className="italic">{cur.globalFallback}</p>
                  </div>
                )}

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

                <div className="mt-3 flex justify-end gap-2">
                  {hasOverride && cur.template.trim().length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update(offset, { template: "" })}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                      Rimuovi override
                    </Button>
                  )}
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
    </div>
  );
}
