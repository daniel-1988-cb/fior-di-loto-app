/**
 * Auto-generated Supabase database types.
 * Regenerate via: npm run db:types (or Supabase MCP generate_typescript_types)
 * Last regenerated: 2026-04-18 from project ixieormnmohexekoufnn
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      ai_documents: {
        Row: {
          categoria: string;
          contenuto: string;
          created_at: string;
          created_by_email: string | null;
          descrizione: string | null;
          id: string;
          nome: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_documents"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_documents"]["Row"]>;
        Relationships: [];
      };
      ai_query_logs: {
        Row: {
          created_at: string;
          domanda: string;
          id: string;
          risposta: string | null;
          user_email: string;
          user_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_query_logs"]["Row"], "id" | "created_at" | "user_email"> & {
          id?: string;
          created_at?: string;
          user_email?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_query_logs"]["Row"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          client_id: string;
          created_at: string;
          data: string;
          id: string;
          note: string | null;
          operatrice_id: string | null;
          ora_fine: string;
          ora_inizio: string;
          service_id: string;
          staff_id: string | null;
          stato: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at" | "stato"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          stato?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
      };
      clients: {
        Row: {
          allergie: string | null;
          avviso_personale: string | null;
          blocked: boolean;
          cognome: string;
          created_at: string;
          data_nascita: string | null;
          email: string | null;
          fonte: string | null;
          id: string;
          indirizzo: string | null;
          nome: string;
          note: string | null;
          patch_test: string | null;
          segmento: string;
          tags: Json | null;
          telefono: string | null;
          totale_speso: number | null;
          totale_visite: number | null;
          ultima_visita: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at" | "segmento"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          segmento?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
      };
      staff: {
        Row: {
          attiva: boolean;
          avatar_url: string | null;
          cognome: string | null;
          colore: string;
          created_at: string;
          email: string | null;
          giorni_lavoro: number[] | null;
          id: string;
          nome: string;
          note: string | null;
          obiettivo_mensile: number | null;
          orario_fine: string;
          orario_inizio: string;
          ruolo: string;
          telefono: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff"]["Row"], "id" | "created_at" | "updated_at" | "attiva" | "colore" | "orario_fine" | "orario_inizio" | "ruolo"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          attiva?: boolean;
          colore?: string;
          orario_fine?: string;
          orario_inizio?: string;
          ruolo?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>;
      };
      services: {
        Row: {
          attivo: boolean;
          categoria: string;
          created_at: string;
          descrizione: string | null;
          durata: number;
          id: string;
          nome: string;
          prezzo: number;
        };
        Insert: Omit<Database["public"]["Tables"]["services"]["Row"], "id" | "created_at" | "attivo"> & {
          id?: string;
          created_at?: string;
          attivo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Row"]>;
      };
      products: {
        Row: {
          attivo: boolean;
          categoria: string | null;
          created_at: string;
          descrizione: string | null;
          giacenza: number;
          id: string;
          nome: string;
          prezzo: number;
          soglia_alert: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "attivo" | "giacenza"> & {
          id?: string;
          created_at?: string;
          attivo?: boolean;
          giacenza?: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      users: {
        Row: {
          attivo: boolean;
          auth_id: string | null;
          cognome: string;
          created_at: string;
          email: string;
          id: string;
          nome: string;
          ruolo: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at" | "attivo" | "ruolo"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          attivo?: boolean;
          ruolo?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      vouchers: {
        Row: {
          acquistato_da_id: string | null;
          appointment_id: string | null;
          codice: string;
          created_at: string;
          data_scadenza: string | null;
          data_uso: string | null;
          descrizione: string | null;
          destinatario_id: string | null;
          id: string;
          product_id: string | null;
          service_id: string | null;
          tipo: string;
          usato: boolean;
          valore: number;
        };
        Insert: Omit<Database["public"]["Tables"]["vouchers"]["Row"], "id" | "created_at" | "usato" | "tipo"> & {
          id?: string;
          created_at?: string;
          usato?: boolean;
          tipo?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vouchers"]["Row"]>;
      };
      transactions: {
        Row: {
          categoria: string | null;
          client_id: string | null;
          created_at: string;
          data: string;
          descrizione: string | null;
          id: string;
          importo: number;
          metodo_pagamento: string | null;
          tipo: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
      };
      treatment_programs: {
        Row: {
          attivo: boolean;
          categoria: string | null;
          created_at: string;
          descrizione: string | null;
          id: string;
          nome: string;
          prezzo: number;
          sedute: number;
          servizi: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["treatment_programs"]["Row"], "id" | "created_at" | "attivo"> & {
          id?: string;
          created_at?: string;
          attivo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["treatment_programs"]["Row"]>;
      };
      staff_ferie: {
        Row: {
          created_at: string;
          data_fine: string;
          data_inizio: string;
          id: string;
          note: string | null;
          staff_id: string;
          tipo: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_ferie"]["Row"], "id" | "created_at" | "tipo"> & {
          id?: string;
          created_at?: string;
          tipo?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_ferie"]["Row"]>;
      };
      client_interactions: {
        Row: {
          client_id: string;
          created_at: string;
          descrizione: string | null;
          id: string;
          importo: number | null;
          metadata: Json | null;
          operatrice_id: string | null;
          tipo: string;
        };
        Insert: Omit<Database["public"]["Tables"]["client_interactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_interactions"]["Row"]>;
      };
      message_templates: {
        Row: {
          attivo: boolean;
          canale: string;
          categoria: string | null;
          contenuto: string;
          created_at: string;
          id: string;
          nome: string;
        };
        Insert: Omit<Database["public"]["Tables"]["message_templates"]["Row"], "id" | "created_at" | "attivo"> & {
          id?: string;
          created_at?: string;
          attivo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["message_templates"]["Row"]>;
      };
      sent_messages: {
        Row: {
          canale: string;
          client_id: string;
          contenuto: string;
          id: string;
          inviato_at: string;
          inviato_da: string | null;
          stato: string;
          template_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["sent_messages"]["Row"], "id" | "inviato_at" | "stato"> & {
          id?: string;
          inviato_at?: string;
          stato?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sent_messages"]["Row"]>;
      };
      social_posts: {
        Row: {
          caption: string | null;
          created_at: string;
          data_pubblicazione: string | null;
          hashtags: Json | null;
          id: string;
          keyword: string | null;
          media_url: string | null;
          piattaforma: string;
          script: string | null;
          stato: string;
          tipo_contenuto: string;
          titolo: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["social_posts"]["Row"], "id" | "created_at" | "updated_at" | "stato"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          stato?: string;
        };
        Update: Partial<Database["public"]["Tables"]["social_posts"]["Row"]>;
      };
      social_competitors: {
        Row: {
          created_at: string;
          engagement_rate: number | null;
          follower: number | null;
          freq_settimanale: number | null;
          handle: string;
          id: string;
          nome: string;
          note: string | null;
          piattaforma: string;
          post_totali: number | null;
          ultimo_aggiornamento: string | null;
          url: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["social_competitors"]["Row"], "id" | "created_at" | "piattaforma"> & {
          id?: string;
          created_at?: string;
          piattaforma?: string;
        };
        Update: Partial<Database["public"]["Tables"]["social_competitors"]["Row"]>;
      };
      competitor_updates: {
        Row: {
          competitor_id: string;
          created_at: string;
          data_rilevazione: string;
          engagement_rate: number | null;
          follower: number | null;
          freq_settimanale: number | null;
          id: string;
          note: string | null;
          post_totali: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["competitor_updates"]["Row"], "id" | "created_at" | "data_rilevazione"> & {
          id?: string;
          created_at?: string;
          data_rilevazione?: string;
        };
        Update: Partial<Database["public"]["Tables"]["competitor_updates"]["Row"]>;
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_user_role: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_authenticated_user: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
