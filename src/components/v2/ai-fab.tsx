"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Sparkles, Send, X, Package, Users, Clock, Scissors } from "lucide-react";
import { Button, Textarea, Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/actions/ai-assistant";

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

const QUICK_ACTIONS = [
  { icon: Scissors, label: "Protocollo trattamento", prompt: "Dimmi passo passo un protocollo di trattamento e i prodotti da utilizzare" },
  { icon: Package, label: "Prodotti consigliati", prompt: "Quali prodotti consigli per una cliente con pelle sensibile?" },
  { icon: Users, label: "Gestione cliente", prompt: "Come posso gestire una cliente insoddisfatta?" },
  { icon: Clock, label: "Policy appuntamenti", prompt: "Qual è la nostra policy su cancellazioni e ritardi?" },
];

export function AiFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { risposta } = await askAssistant(text);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: risposta || "Non sono riuscita a rispondere — riprova tra poco.",
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Errore imprevisto. L'assistente AI potrebbe non essere configurato (GEMINI_API_KEY).";
      setMessages((m) => [
        ...m,
        { role: "assistant", text: msg, ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri assistente AI"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          "bg-gradient-to-br from-primary to-secondary"
        )}
      >
        <Bot className="h-6 w-6" />
        <span className="sr-only">Assistente AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:items-end sm:justify-end"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Chiudi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative m-0 flex h-full w-full flex-col bg-card text-card-foreground shadow-2xl sm:m-4 sm:h-[640px] sm:w-[420px] sm:rounded-2xl sm:border sm:border-border">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Assistente AI</p>
                  <p className="text-xs text-muted-foreground">Chiedi qualsiasi cosa</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div>
                  <div className="mx-auto max-w-xs text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                      <Bot className="h-7 w-7" />
                    </div>
                    <h2 className="mt-3 text-base font-semibold">Ciao, come posso aiutarti?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ho accesso ai documenti interni del centro. Fammi una domanda o scegli
                      un&apos;azione rapida.
                    </p>
                  </div>
                  <div className="mt-6 grid gap-2">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => send(a.prompt)}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                      >
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                          <a.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{a.label}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {a.prompt}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.ts}
                  className={cn(
                    "flex gap-2",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <Avatar name="AI" size="sm" color="#6B4EFF" />
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <Avatar name="AI" size="sm" color="#6B4EFF" />
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/40" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/40 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/40 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Scrivi un messaggio…"
                  rows={1}
                  className="min-h-10 max-h-32 resize-none"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                <Badge variant="outline" className="mr-1">
                  AI
                </Badge>
                Le risposte si basano sui documenti caricati in Impostazioni → Assistente AI.
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
