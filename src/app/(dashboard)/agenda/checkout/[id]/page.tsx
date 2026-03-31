"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, CreditCard, CheckCircle } from "lucide-react";
import { getAppointment } from "@/lib/actions/appointments";
import { updateAppointmentStatus } from "@/lib/actions/appointments";
import { createTransaction } from "@/lib/actions/transactions";
import { getVoucherByCode, redeemVoucher } from "@/lib/actions/vouchers";

type AppointmentData = {
  id: string;
  stato: string;
  data: string;
  ora_inizio: string;
  clients: { id: string; nome: string; cognome: string; telefono: string | null } | null;
  services: { id: string; nome: string; durata: number; prezzo: number; categoria: string } | null;
};

type VoucherData = {
  id: string;
  codice: string;
  tipo: string;
  valore: number;
};

const inputClass =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

function CheckoutForm({ id }: { id: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scontoTipo, setScontoTipo] = useState<"percentuale" | "importo">("percentuale");
  const [scontoValore, setScontoValore] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("contanti");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAppointment(id);
        setAppointment(data as unknown as AppointmentData);
      } catch (err) {
        console.error("Errore caricamento appuntamento:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const prezzoBase = Number(appointment?.services?.prezzo || 0);

  function calcSconto(): number {
    const val = parseFloat(scontoValore) || 0;
    if (scontoTipo === "percentuale") {
      return Math.min((prezzoBase * val) / 100, prezzoBase);
    }
    return Math.min(val, prezzoBase);
  }

  function calcVoucherSconto(): number {
    if (!voucher) return 0;
    if (voucher.tipo === "importo") return Math.min(Number(voucher.valore), prezzoBase);
    if (voucher.tipo === "servizio" || voucher.tipo === "prodotto") return prezzoBase;
    return 0;
  }

  const scontoManuale = calcSconto();
  const scontoVoucher = calcVoucherSconto();
  const totale = Math.max(prezzoBase - scontoManuale - scontoVoucher, 0);

  async function handleApplyVoucher() {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setVoucherLoading(true);
    try {
      const found = await getVoucherByCode(voucherCode.trim());
      if (!found) {
        setVoucherError("Voucher non trovato o già utilizzato.");
        setVoucher(null);
      } else {
        // Check expiry
        if (found.data_scadenza && new Date(found.data_scadenza) < new Date()) {
          setVoucherError("Questo voucher è scaduto.");
          setVoucher(null);
        } else {
          setVoucher(found as unknown as VoucherData);
          setVoucherError("");
        }
      }
    } catch (err) {
      console.error(err);
      setVoucherError("Errore nella verifica del voucher.");
    } finally {
      setVoucherLoading(false);
    }
  }

  async function handleCompleta() {
    if (!appointment) return;
    setSaving(true);
    try {
      await updateAppointmentStatus(id, "completato");

      const today = new Date().toISOString().slice(0, 10);
      await createTransaction({
        clientId: appointment.clients?.id,
        tipo: "entrata",
        categoria: appointment.services?.categoria || "servizi",
        descrizione: appointment.services?.nome || "Servizio",
        importo: totale > 0 ? totale : 0.01,
        metodoPagamento: metodoPagamento,
        data: today,
      });

      if (voucher) {
        await redeemVoucher(voucher.id, id);
      }

      router.push("/agenda");
    } catch (err) {
      console.error("Errore checkout:", err);
      alert("Errore durante il checkout. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Appuntamento non trovato.</p>
        <Link href="/agenda" className="mt-4 inline-block text-sm text-rose hover:underline">
          Torna all&apos;agenda
        </Link>
      </div>
    );
  }

  const clientName = appointment.clients
    ? `${appointment.clients.nome} ${appointment.clients.cognome}`
    : "Cliente sconosciuto";

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/agenda"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all&apos;agenda
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Checkout
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Riepilogo appuntamento */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-brown">Riepilogo Appuntamento</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium text-brown">{clientName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Servizio</dt>
              <dd className="font-medium text-brown">{appointment.services?.nome ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium text-brown">
                {new Date(appointment.data + "T00:00:00").toLocaleDateString("it-IT", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ora</dt>
              <dd className="font-medium text-brown">{appointment.ora_inizio.slice(0, 5)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-semibold text-brown">Prezzo base</dt>
              <dd className="text-xl font-bold text-brown">€{prezzoBase.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Pagamento */}
        <div className="space-y-4">
          {/* Sconto manuale */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Sconto</h2>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScontoTipo("percentuale")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  scontoTipo === "percentuale"
                    ? "border-rose bg-rose text-white"
                    : "border-border bg-card text-brown hover:bg-cream-dark"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setScontoTipo("importo")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  scontoTipo === "importo"
                    ? "border-rose bg-rose text-white"
                    : "border-border bg-card text-brown hover:bg-cream-dark"
                }`}
              >
                € Fisso
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={scontoValore}
              onChange={(e) => setScontoValore(e.target.value)}
              placeholder={scontoTipo === "percentuale" ? "Es. 10 per 10%" : "Es. 5.00"}
              className={inputClass}
            />
            {scontoManuale > 0 && (
              <p className="mt-2 text-sm text-green-600">
                Sconto applicato: -€{scontoManuale.toFixed(2)}
              </p>
            )}
          </div>

          {/* Voucher */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-brown">
              <Tag className="h-4 w-4" />
              Voucher
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Es. FDL-A3X9"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={voucherLoading || !voucherCode.trim()}
                className="rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark disabled:opacity-50"
              >
                {voucherLoading ? "..." : "Applica"}
              </button>
            </div>
            {voucherError && (
              <p className="mt-2 text-sm text-red-500">{voucherError}</p>
            )}
            {voucher && (
              <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-semibold text-green-700">
                  Voucher {voucher.codice} applicato
                </p>
                <p className="text-sm text-green-600">
                  Sconto: -€{scontoVoucher.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Metodo pagamento */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-brown">
              <CreditCard className="h-4 w-4" />
              Metodo di Pagamento
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(["contanti", "carta", "bonifico", "satispay"] as const).map((metodo) => (
                <button
                  key={metodo}
                  type="button"
                  onClick={() => setMetodoPagamento(metodo)}
                  className={`rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                    metodoPagamento === metodo
                      ? "border-rose bg-rose text-white"
                      : "border-border bg-card text-brown hover:bg-cream-dark"
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>
          </div>

          {/* Totale e conferma */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-brown">Totale da pagare</span>
              <span className="text-3xl font-bold text-rose">€{totale.toFixed(2)}</span>
            </div>
            {(scontoManuale > 0 || scontoVoucher > 0) && (
              <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Prezzo base</span>
                  <span>€{prezzoBase.toFixed(2)}</span>
                </div>
                {scontoManuale > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Sconto manuale</span>
                    <span>-€{scontoManuale.toFixed(2)}</span>
                  </div>
                )}
                {scontoVoucher > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Voucher {voucher?.codice}</span>
                    <span>-€{scontoVoucher.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleCompleta}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose px-6 py-3 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? "Registrazione in corso..." : "Completa e Registra Pagamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento...</div>}>
      <CheckoutForm id={id} />
    </Suspense>
  );
}
