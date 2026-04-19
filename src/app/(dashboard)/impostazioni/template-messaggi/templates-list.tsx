"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, Badge, Button, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import {
  MessageCircle,
  Mail,
  Send,
  Bell,
  Plus,
  Edit3,
  Inbox,
} from "lucide-react";
import { TemplateCardActions } from "./template-card-actions";

type Template = {
  id: string;
  nome: string;
  canale: string;
  categoria: string | null;
  contenuto: string;
  attivo: boolean;
  created_at: string;
};

const TABS = [
  { value: "all", label: "Tutti" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
];

function channelIcon(canale: string) {
  switch (canale) {
    case "whatsapp":
      return MessageCircle;
    case "email":
      return Mail;
    case "sms":
      return Send;
    case "push":
      return Bell;
    default:
      return MessageCircle;
  }
}

function channelLabel(canale: string) {
  switch (canale) {
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "push":
      return "Push";
    default:
      return canale;
  }
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function TemplatesList({ templates }: { templates: Template[] }) {
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (tab === "all") return templates;
    return templates.filter((t) => t.canale === tab);
  }, [templates, tab]);

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Inbox className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessun template</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Non hai ancora creato template per questo canale. Creane uno per
            riutilizzare messaggi nelle campagne e nei flussi automatici.
          </p>
          <Link
            href="/impostazioni/template-messaggi/nuovo"
            className="mt-6 inline-block"
          >
            <Button>
              <Plus className="h-4 w-4" /> Crea il primo template
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => {
            const Icon = channelIcon(t.canale);
            return (
              <Card key={t.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="rounded-md bg-muted p-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.nome}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{channelLabel(t.canale)}</Badge>
                        {t.categoria && (
                          <Badge variant="primary">{t.categoria}</Badge>
                        )}
                        {t.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="default">Disattivato</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {truncate(t.contenuto, 140)}
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Link href={`/impostazioni/template-messaggi/${t.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-3.5 w-3.5" /> Modifica
                    </Button>
                  </Link>
                  <TemplateCardActions
                    id={t.id}
                    nome={t.nome}
                    attivo={t.attivo}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
