"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import {
  updateLoyaltySettings,
  type LoyaltySettings,
} from "@/lib/actions/loyalty";

export function SettingsForm({ settings }: { settings: LoyaltySettings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({
    attivo: settings.attivo,
    euro_per_punto: String(settings.euro_per_punto ?? 1),
    soglia_silver: String(settings.soglia_silver ?? 100),
    soglia_gold: String(settings.soglia_gold ?? 300),
    soglia_vip: String(settings.soglia_vip ?? 800),
    punti_compleanno: String(settings.punti_compleanno ?? 0),
    punti_referral: String(settings.punti_referral ?? 0),
    scadenza_punti_giorni:
      settings.scadenza_punti_giorni == null
        ? ""
        : String(settings.scadenza_punti_giorni),
  });

  function num(v: string): number | undefined {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setLoading(true);
    try {
      await updateLoyaltySettings({
        attivo: form.attivo,
        euro_per_punto: num(form.euro_per_punto),
        soglia_silver: num(form.soglia_silver),
        soglia_gold: num(form.soglia_gold),
        soglia_vip: num(form.soglia_vip),
        punti_compleanno: num(form.punti_compleanno),
        punti_referral: num(form.punti_referral),
        scadenza_punti_giorni:
          form.scadenza_punti_giorni.trim() === ""
            ? null
            : num(form.scadenza_punti_giorni) ?? null,
      });
      setOk(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Attivo toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="font-medium">Programma fedeltà attivo</p>
          <p className="text-sm text-muted-foreground">
            Quando attivo, i punti vengono assegnati automaticamente sui
            servizi completati.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.attivo}
          onClick={() => setForm({ ...form, attivo: !form.attivo })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.attivo ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.attivo ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="euro_per_punto">Euro per punto</Label>
          <Input
            id="euro_per_punto"
            type="number"
            step="0.5"
            min="0.5"
            value={form.euro_per_punto}
            onChange={(e) =>
              setForm({ ...form, euro_per_punto: e.target.value })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Es. 1 = 1 punto per ogni euro speso.
          </p>
        </div>
        <div>
          <Label htmlFor="scadenza_punti_giorni">
            Scadenza punti (giorni)
          </Label>
          <Input
            id="scadenza_punti_giorni"
            type="number"
            min="1"
            placeholder="Mai"
            value={form.scadenza_punti_giorni}
            onChange={(e) =>
              setForm({ ...form, scadenza_punti_giorni: e.target.value })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Lascia vuoto per non far scadere i punti.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Soglie tier
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="soglia_silver">Silver</Label>
            <Input
              id="soglia_silver"
              type="number"
              min="0"
              value={form.soglia_silver}
              onChange={(e) =>
                setForm({ ...form, soglia_silver: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="soglia_gold">Gold</Label>
            <Input
              id="soglia_gold"
              type="number"
              min="0"
              value={form.soglia_gold}
              onChange={(e) =>
                setForm({ ...form, soglia_gold: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="soglia_vip">VIP</Label>
            <Input
              id="soglia_vip"
              type="number"
              min="0"
              value={form.soglia_vip}
              onChange={(e) =>
                setForm({ ...form, soglia_vip: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="punti_compleanno">Punti bonus compleanno</Label>
          <Input
            id="punti_compleanno"
            type="number"
            min="0"
            value={form.punti_compleanno}
            onChange={(e) =>
              setForm({ ...form, punti_compleanno: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="punti_referral">Punti per referral</Label>
          <Input
            id="punti_referral"
            type="number"
            min="0"
            value={form.punti_referral}
            onChange={(e) =>
              setForm({ ...form, punti_referral: e.target.value })
            }
          />
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {err}
        </div>
      )}
      {ok && !err && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Impostazioni salvate.
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4" />
          {loading ? "Salvataggio…" : "Salva impostazioni"}
        </Button>
      </div>
    </form>
  );
}
