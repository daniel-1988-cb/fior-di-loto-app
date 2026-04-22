import type { LucideIcon } from "lucide-react";
import {
  CalendarPlus,
  UsersRound,
  CalendarX,
  Tag,
  Coins,
} from "lucide-react";

/**
 * Azioni rapide stile Fresha mostrate nel popover "slot agenda"
 * e nel dropdown del bottone "Aggiungi" in pagina agenda.
 *
 * Alcune azioni non hanno ancora una route implementata: quelle
 * sono marcate `implemented: false` e vengono renderizzate come
 * bottoni disabilitati con tooltip "Prossimamente".
 */
export type QuickActionId =
  | "appt"
  | "appt_gruppo"
  | "slot_bloccato"
  | "vendita"
  | "pagamento_rapido";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * Se true, esiste una route di destinazione: il componente la compone
   * via {@link buildHref}. Se false, l'azione è disabilitata con tooltip.
   */
  implemented: boolean;
  /**
   * Costruisce l'URL di destinazione a partire dal contesto dello slot
   * (data/ora/staffId opzionali, usati solo dalle azioni agganciate all'agenda).
   * Ritorna `null` se l'azione non è implementata.
   */
  buildHref: (ctx: {
    date?: string;
    time?: string;
    staffId?: string;
  }) => string | null;
  /** Flag di default (true = abilitata out-of-the-box, false = off) */
  enabledByDefault: boolean;
}

/**
 * Lista predefinita delle 5 azioni rapide (ordine = ordine di default).
 * Mantiene parità con le azioni Fresha viste negli screenshot forniti.
 */
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "appt",
    label: "Aggiungi appuntamento",
    description: "Nuovo appuntamento individuale, pre-compilato con l'orario dello slot.",
    icon: CalendarPlus,
    implemented: true,
    buildHref: ({ date, time, staffId }) => {
      const params = new URLSearchParams();
      if (date) params.set("data", date);
      if (time) params.set("ora", time);
      if (staffId) params.set("staffId", staffId);
      const qs = params.toString();
      return qs ? `/agenda/nuovo?${qs}` : "/agenda/nuovo";
    },
    enabledByDefault: true,
  },
  {
    id: "appt_gruppo",
    label: "Aggiungi appuntamento di gruppo",
    description: "Appuntamento con più partecipanti (prossimamente).",
    icon: UsersRound,
    implemented: false,
    buildHref: () => null,
    enabledByDefault: false,
  },
  {
    id: "slot_bloccato",
    label: "Aggiungi fascia oraria bloccata",
    description: "Blocca uno spazio in agenda (pausa, ferie, formazione).",
    icon: CalendarX,
    implemented: true,
    buildHref: ({ date, time, staffId }) => {
      const params = new URLSearchParams();
      if (date) params.set("data", date);
      if (time) params.set("ora", time);
      if (staffId) params.set("staffId", staffId);
      const qs = params.toString();
      return qs ? `/agenda/blocca?${qs}` : "/agenda/blocca";
    },
    enabledByDefault: true,
  },
  {
    id: "vendita",
    label: "Vendita",
    description: "Registra una vendita diretta (prodotti, voucher, servizi).",
    icon: Tag,
    implemented: true,
    // Nota: la route `/vendite/nuovo` non esiste nel repo;
    // atterriamo quindi sulla landing vendite `/vendite`.
    buildHref: () => "/vendite",
    enabledByDefault: true,
  },
  {
    id: "pagamento_rapido",
    label: "Pagamento rapido",
    description: "Incasso veloce senza appuntamento collegato (prossimamente).",
    icon: Coins,
    implemented: false,
    buildHref: () => null,
    enabledByDefault: false,
  },
];
