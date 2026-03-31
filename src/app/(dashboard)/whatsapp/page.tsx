"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  User,
} from "lucide-react";
import { getClients } from "@/lib/actions/messages";
import { generaMessaggioAI, type TipoMessaggio } from "@/lib/actions/ai-messages";

type Client = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  segmento: string;
};

const TIPI_MESSAGGIO: { value: TipoMessaggio; label: string; emoji: string }[] = [
  { value: "promemoria_appuntamento", label: "Promemoria Appuntamento", emoji: "📅" },
  { value: "conferma_appuntamento", label: "Conferma Appuntamento", emoji: "✅" },
  { value: "follow_up_trattamento", label: "Follow-up Trattamento", emoji: "💆" },
  { value: "offerta_speciale", label: "Offerta Speciale", emoji: "🎁" },
  { value: "auguri_compleanno", label: "Auguri Compleanno", emoji: "🎂" },
  { value: "ringraziamento", label: "Ringraziamento", emoji: "💖" },
  { value: "riattivazione", label: "Riattivazione Cliente", emoji: "✨" },
  { value: "personalizzato", label: "Messaggio Personalizzato", emoji: "✍️" },
];

const SEGMENTO_STYLE: Record<string, string> = {
  lotina: "bg-gold/20 text-gold-dark",
  vip: "bg-rose/20 text-rose-dark",
  nuova: "bg-success/20 text-success",
  lead: "bg-info/20 text-info",
  inattiva: "bg-muted text-muted-foreground",
};
const SEGMENTO_LABEL: Record<string, string> = {
  lotina: "Lotina", vip: "VIP", nuova: "Nuova", lead: "Lead", inattiva: "Inattiva",
};

const inputClass =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

export default function WhatsAppPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [tipoMessaggio, setTipoMessaggio] = useState<TipoMessaggio>("promemoria_appuntamento");
  const [contestoExtra, setContestaExtra] = useState("");
  const [messaggioGenerato, setMessaggioGenerato] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchCliente, setSearchCliente] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    getClients().then((list) => setClients(list as Client[]));
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const filteredClients = searchCliente
    ? clients.filter((c) =>
        `${c.nome} ${c.cognome}`.toLowerCase().includes(searchCliente.toLowerCase()) ||
        (c.telefono || "").includes(searchCliente)
      )
    : clients;

  async function handleGenera() {
    if (!selectedClientId) { setError("Seleziona una cliente"); return; }
    setLoading(true);
    setError("");
    setMessaggioGenerato("");
    try {
      const result = await generaMessaggioAI({
        clientId: selectedClientId,
        tipo: tipoMessaggio,
        contestoExtra: contestoExtra || undefined,
      });
      setMessaggioGenerato(result.messaggio);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore generazione";
      if (msg.includes("ANTHROPIC_API_KEY") || msg.includes("API key")) {
        setError("Chiave API Anthropic non configurata. Aggiungi ANTHROPIC_API_KEY in .env.local");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOpenWhatsApp() {
    if (!selectedClient?.telefono) return;
    const phone = selectedClient.telefono.replace(/\D/g, "");
    const url = `https://wa.me/39${phone}?text=${encodeURIComponent(messaggioGenerato)}`;
    window.open(url, "_blank");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(messaggioGenerato);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          WhatsApp AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          L&apos;AI genera messaggi personalizzati per ogni cliente basandosi sul suo profilo CRM
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Configuration */}
        <div className="space-y-4">
          {/* Client selector */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-brown">
              <User className="h-4 w-4" />
              Seleziona Cliente
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca per nome o telefono..."
                value={selectedClient ? `${selectedClient.nome} ${selectedClient.cognome}` : searchCliente}
                onChange={(e) => {
                  if (selectedClient) {
                    setSelectedClientId("");
                    setMessaggioGenerato("");
                  }
                  setSearchCliente(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className={inputClass}
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />

              {showDropdown && filteredClients.length > 0 && !selectedClient && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white shadow-lg">
                  {filteredClients.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setSearchCliente("");
                        setShowDropdown(false);
                        setMessaggioGenerato("");
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-cream-dark"
                    >
                      <div>
                        <span className="text-sm font-medium text-brown">
                          {c.nome} {c.cognome}
                        </span>
                        {c.telefono && (
                          <span className="ml-2 text-xs text-muted-foreground">{c.telefono}</span>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEGMENTO_STYLE[c.segmento] || "bg-muted text-muted-foreground"}`}>
                        {SEGMENTO_LABEL[c.segmento] || c.segmento}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-cream-dark/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose/10">
                    <span className="text-xs font-bold text-rose">
                      {selectedClient.nome[0]}{selectedClient.cognome[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brown">
                      {selectedClient.nome} {selectedClient.cognome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedClient.telefono || "Nessun telefono"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedClientId(""); setMessaggioGenerato(""); }}
                  className="text-xs text-muted-foreground hover:text-brown"
                >
                  Cambia
                </button>
              </div>
            )}
          </div>

          {/* Message type */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Tipo di Messaggio</h2>
            <div className="grid grid-cols-2 gap-2">
              {TIPI_MESSAGGIO.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => { setTipoMessaggio(tipo.value); setMessaggioGenerato(""); }}
                  className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    tipoMessaggio === tipo.value
                      ? "border-rose bg-rose/5 text-rose"
                      : "border-border bg-white text-brown hover:border-rose/40"
                  }`}
                >
                  <span className="mr-1">{tipo.emoji}</span>
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extra context */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-brown">Contesto Extra <span className="text-xs font-normal text-muted-foreground">(opzionale)</span></h2>
            <textarea
              value={contestoExtra}
              onChange={(e) => setContestaExtra(e.target.value)}
              placeholder="Es: ha un appuntamento domani alle 15:00 per pulizia viso, offerta del 20% sul prossimo trattamento..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenera}
            disabled={loading || !selectedClientId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brown px-4 py-3 text-sm font-semibold text-white hover:bg-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Genera con AI
              </>
            )}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* RIGHT — Preview & Send */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brown">Messaggio Generato</h2>
              {messaggioGenerato && (
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-cream-dark"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiato!" : "Copia"}
                </button>
              )}
            </div>

            {messaggioGenerato ? (
              <>
                {/* WhatsApp bubble preview */}
                <div className="mb-4 rounded-xl bg-[#ECE5DD] p-4">
                  <div className="max-w-xs rounded-2xl rounded-tl-none bg-white px-4 py-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-[#111]">{messaggioGenerato}</p>
                    <p className="mt-1 text-right text-[10px] text-[#999]">
                      {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} ✓✓
                    </p>
                  </div>
                </div>

                {/* Editable version */}
                <textarea
                  value={messaggioGenerato}
                  onChange={(e) => setMessaggioGenerato(e.target.value)}
                  rows={6}
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1 text-xs text-muted-foreground">Puoi modificare il testo prima di inviare</p>

                {/* Send buttons */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={!selectedClient?.telefono}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20bc5a] disabled:opacity-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apri WhatsApp
                  </button>
                  <button
                    onClick={handleGenera}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Rigenera
                  </button>
                </div>

                {selectedClient && !selectedClient.telefono && (
                  <p className="mt-2 text-center text-xs text-red-500">
                    Questa cliente non ha un numero di telefono registrato
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-cream-dark/30 py-16">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose/10">
                  <MessageCircle className="h-6 w-6 text-rose/60" />
                </div>
                <p className="text-sm font-medium text-brown">Il messaggio apparirà qui</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seleziona una cliente e clicca &quot;Genera con AI&quot;
                </p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-border bg-cream-dark/40 p-4">
            <p className="mb-2 text-xs font-medium text-brown">Come funziona</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>🤖 L&apos;AI legge il profilo completo della cliente dal CRM</li>
              <li>📝 Genera un messaggio personalizzato in italiano</li>
              <li>✏️ Puoi modificare il testo prima di inviare</li>
              <li>📱 Un click apre WhatsApp con il messaggio pronto</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Broadcast section */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brown">
              <Send className="mr-2 inline-block h-4 w-4" />
              Broadcast per Segmento
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Genera messaggi personalizzati per tutte le clienti di un segmento
            </p>
          </div>
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold-dark">
            Prossimamente
          </span>
        </div>
      </div>
    </div>
  );
}
