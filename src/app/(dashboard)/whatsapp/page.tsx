"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, Filter } from "lucide-react";
import { getTemplates } from "@/lib/actions/messages";
import { getClients } from "@/lib/actions/messages";

type Template = {
  id: string;
  nome: string;
  canale: string;
  contenuto: string;
  categoria: string;
  attivo: boolean;
};

type Client = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  segmento: string;
};

const categorieTab = [
  { value: "tutti", label: "Tutti" },
  { value: "conferma", label: "Conferma" },
  { value: "promemoria", label: "Promemoria" },
  { value: "offerta", label: "Offerta" },
  { value: "follow_up", label: "Follow Up" },
  { value: "auguri", label: "Auguri" },
];

export default function WhatsAppPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("tutti");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    async function loadData() {
      const [tmplList, clientList] = await Promise.all([
        getTemplates(),
        getClients(),
      ]);
      setTemplates(tmplList as unknown as Template[]);
      setClients(clientList as unknown as Client[]);
    }
    loadData();
  }, []);

  const filteredTemplates =
    categoriaFiltro === "tutti"
      ? templates
      : templates.filter((t) => t.categoria === categoriaFiltro);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  function getPreviewMessage() {
    if (!selectedTemplate) return "";
    let msg = selectedTemplate.contenuto;
    if (selectedClient) {
      msg = msg.replace(/\{\{nome\}\}/g, selectedClient.nome);
      msg = msg.replace(/\{\{cognome\}\}/g, selectedClient.cognome);
      msg = msg.replace(/\{\{nome_completo\}\}/g, `${selectedClient.nome} ${selectedClient.cognome}`);
    }
    return msg;
  }

  function handleOpenWhatsApp() {
    if (!selectedClient || !selectedClient.telefono) {
      alert("Cliente senza numero di telefono");
      return;
    }
    const message = getPreviewMessage();
    const phone = selectedClient.telefono.replace(/\D/g, "");
    const url = `https://wa.me/39${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleziona un template e invia un messaggio alla cliente
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Templates */}
        <div>
          {/* Category filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Filter className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            {categorieTab.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaFiltro(cat.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  categoriaFiltro === cat.value
                    ? "bg-rose text-white"
                    : "bg-cream-dark text-brown hover:bg-rose/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTemplates.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nessun template disponibile</p>
              </div>
            )}
            {filteredTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className={`cursor-pointer rounded-xl border p-4 shadow-sm transition-colors ${
                  selectedTemplate?.id === tmpl.id
                    ? "border-rose bg-rose/5"
                    : "border-border bg-card hover:border-rose/50"
                }`}
                onClick={() => setSelectedTemplate(tmpl)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-brown">{tmpl.nome}</h3>
                  <span className="rounded-full bg-cream-dark px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    {tmpl.categoria.replace("_", " ")}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{tmpl.contenuto}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(tmpl);
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-dark"
                >
                  <MessageCircle className="h-3 w-3" />
                  Usa questo template
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview & Send */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-brown">Invia Messaggio</h2>

            {/* Client selector */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-brown">Seleziona Cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={inputClass}
              >
                <option value="">Seleziona cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cognome}
                    {c.telefono ? ` — ${c.telefono}` : " — senza tel."}
                  </option>
                ))}
              </select>
            </div>

            {/* Template preview */}
            {selectedTemplate ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-brown">
                  Anteprima Messaggio
                </label>
                <div className="min-h-[120px] rounded-lg border border-input bg-cream-dark/40 p-3 text-sm text-brown whitespace-pre-wrap">
                  {getPreviewMessage() || (
                    <span className="text-muted-foreground italic">
                      Seleziona una cliente per vedere l&apos;anteprima
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Template: <span className="font-medium">{selectedTemplate.nome}</span>
                  {" · "}
                  <span className="capitalize">{selectedTemplate.categoria.replace("_", " ")}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Seleziona un template dalla lista
                </p>
              </div>
            )}

            {/* Open WhatsApp button */}
            <button
              onClick={handleOpenWhatsApp}
              disabled={!selectedTemplate || !selectedClientId}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20bc5a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Apri WhatsApp
            </button>

            {selectedClient && !selectedClient.telefono && (
              <p className="mt-2 text-center text-xs text-red-500">
                Questa cliente non ha un numero di telefono registrato
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-border bg-cream-dark/40 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-brown">Come funziona:</span> Seleziona un template e
              una cliente, poi clicca &quot;Apri WhatsApp&quot; per aprire la chat con il messaggio
              pre-compilato. Puoi usare{" "}
              <code className="rounded bg-cream-dark px-1 font-mono">{"{{nome}}"}</code> nel testo
              per inserire il nome della cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
