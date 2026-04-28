export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_documents: {
        Row: {
          categoria: string
          contenuto: string
          created_at: string
          created_by_email: string | null
          descrizione: string | null
          id: string
          nome: string
          visibilita: string
        }
        Insert: {
          categoria?: string
          contenuto: string
          created_at?: string
          created_by_email?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          visibilita?: string
        }
        Update: {
          categoria?: string
          contenuto?: string
          created_at?: string
          created_by_email?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          visibilita?: string
        }
        Relationships: []
      }
      ai_query_logs: {
        Row: {
          created_at: string
          domanda: string
          id: string
          risposta: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          domanda: string
          id?: string
          risposta?: string | null
          user_email?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          domanda?: string
          id?: string
          risposta?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      appointment_followups_sent: {
        Row: {
          appointment_id: string
          channel: string
          error: string | null
          id: string
          rule_id: string
          sent_at: string
          status: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          error?: string | null
          id?: string
          rule_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          error?: string | null
          id?: string
          rule_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_followups_sent_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_followups_sent_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "service_followup_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          appointment_id: string | null
          appointment_id_ref: string | null
          client_id: string
          created_at: string
          id: string
          note_operatore: string | null
          processed_at: string | null
          proposed_alternatives: Json | null
          proposed_datetime: string | null
          stato: string
          testo_richiesta: string
          tipo: string
        }
        Insert: {
          appointment_id?: string | null
          appointment_id_ref?: string | null
          client_id: string
          created_at?: string
          id?: string
          note_operatore?: string | null
          processed_at?: string | null
          proposed_alternatives?: Json | null
          proposed_datetime?: string | null
          stato?: string
          testo_richiesta: string
          tipo?: string
        }
        Update: {
          appointment_id?: string | null
          appointment_id_ref?: string | null
          client_id?: string
          created_at?: string
          id?: string
          note_operatore?: string | null
          processed_at?: string | null
          proposed_alternatives?: Json | null
          proposed_datetime?: string | null
          stato?: string
          testo_richiesta?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_appointment_id_ref_fkey"
            columns: ["appointment_id_ref"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          created_at: string
          data: string
          id: string
          note: string | null
          operatrice_id: string | null
          ora_fine: string
          ora_inizio: string
          pagato_at: string | null
          reminder_sent_at: string | null
          service_id: string
          staff_id: string | null
          stato: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data: string
          id?: string
          note?: string | null
          operatrice_id?: string | null
          ora_fine: string
          ora_inizio: string
          pagato_at?: string | null
          reminder_sent_at?: string | null
          service_id: string
          staff_id?: string | null
          stato?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          operatrice_id?: string | null
          ora_fine?: string
          ora_inizio?: string
          pagato_at?: string | null
          reminder_sent_at?: string | null
          service_id?: string
          staff_id?: string | null
          stato?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_operatrice_id_fkey"
            columns: ["operatrice_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          created_at: string
          data: string
          id: string
          note: string | null
          ora_fine: string
          ora_inizio: string
          staff_id: string | null
          tipo: string
          titolo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          note?: string | null
          ora_fine: string
          ora_inizio: string
          staff_id?: string | null
          tipo?: string
          titolo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          ora_fine?: string
          ora_inizio?: string
          staff_id?: string | null
          tipo?: string
          titolo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_debug: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          kind: string
          payload: Json
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          apertura: string | null
          chiuso: boolean
          chiusura: string | null
          giorno: number
          id: string
          pausa_fine: string | null
          pausa_inizio: string | null
        }
        Insert: {
          apertura?: string | null
          chiuso?: boolean
          chiusura?: string | null
          giorno: number
          id?: string
          pausa_fine?: string | null
          pausa_inizio?: string | null
        }
        Update: {
          apertura?: string | null
          chiuso?: boolean
          chiusura?: string | null
          giorno?: number
          id?: string
          pausa_fine?: string | null
          pausa_inizio?: string | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          cap: string | null
          citta: string | null
          codice_fiscale: string | null
          currency: string
          email: string | null
          google_review_url: string | null
          id: string
          indirizzo: string | null
          iva_default: number
          logo_url: string | null
          metodi_pagamento: string[]
          nome: string
          p_iva: string | null
          paese: string
          policy_cancellazione: string | null
          provincia: string | null
          sito_web: string | null
          telefono: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          currency?: string
          email?: string | null
          google_review_url?: string | null
          id?: string
          indirizzo?: string | null
          iva_default?: number
          logo_url?: string | null
          metodi_pagamento?: string[]
          nome?: string
          p_iva?: string | null
          paese?: string
          policy_cancellazione?: string | null
          provincia?: string | null
          sito_web?: string | null
          telefono?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          currency?: string
          email?: string | null
          google_review_url?: string | null
          id?: string
          indirizzo?: string | null
          iva_default?: number
          logo_url?: string | null
          metodi_pagamento?: string[]
          nome?: string
          p_iva?: string | null
          paese?: string
          policy_cancellazione?: string | null
          provincia?: string | null
          sito_web?: string | null
          telefono?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          body: string
          canale: string
          completed_at: string | null
          created_at: string
          error_count: number
          id: string
          nome: string
          schedule_at: string | null
          segmento_target: string | null
          sent_count: number
          started_at: string | null
          stato: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          canale: string
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          nome: string
          schedule_at?: string | null
          segmento_target?: string | null
          sent_count?: number
          started_at?: string | null
          stato?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          canale?: string
          completed_at?: string | null
          created_at?: string
          error_count?: number
          id?: string
          nome?: string
          schedule_at?: string | null
          segmento_target?: string | null
          sent_count?: number
          started_at?: string | null
          stato?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          id: string
          mime_type: string | null
          nome: string
          note: string | null
          size_bytes: number | null
          storage_path: string
          tipo: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome: string
          note?: string | null
          size_bytes?: number | null
          storage_path: string
          tipo?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome?: string
          note?: string | null
          size_bytes?: number | null
          storage_path?: string
          tipo?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string
          descrizione: string | null
          id: string
          importo: number | null
          metadata: Json | null
          operatrice_id: string | null
          tipo: string
        }
        Insert: {
          client_id: string
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          metadata?: Json | null
          operatrice_id?: string | null
          tipo: string
        }
        Update: {
          client_id?: string
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number | null
          metadata?: Json | null
          operatrice_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_operatrice_id_fkey"
            columns: ["operatrice_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reviews: {
        Row: {
          client_id: string
          created_at: string
          id: string
          published_google: boolean
          rating: number
          review_request_id: string | null
          testo: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          published_google?: boolean
          rating: number
          review_request_id?: string | null
          testo?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          published_google?: boolean
          rating?: number
          review_request_id?: string | null
          testo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reviews_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_wallet_transactions: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          importo: number
          saldo_dopo: number
          tipo: string
          transaction_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          importo: number
          saldo_dopo: number
          tipo: string
          transaction_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          importo?: number
          saldo_dopo?: number
          tipo?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_wallet_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          allergie: string | null
          avviso_personale: string | null
          blocked: boolean
          cognome: string
          created_at: string
          data_nascita: string | null
          email: string | null
          fonte: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          patch_test: string | null
          punti: number
          segmento: string
          tags: Json | null
          telefono: string | null
          tier: string
          totale_speso: number | null
          totale_visite: number | null
          ultima_visita: string | null
          updated_at: string
          wa_last_seen: string | null
          wa_opt_in: boolean
          wa_phone_verified: boolean
        }
        Insert: {
          allergie?: string | null
          avviso_personale?: string | null
          blocked?: boolean
          cognome: string
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          patch_test?: string | null
          punti?: number
          segmento?: string
          tags?: Json | null
          telefono?: string | null
          tier?: string
          totale_speso?: number | null
          totale_visite?: number | null
          ultima_visita?: string | null
          updated_at?: string
          wa_last_seen?: string | null
          wa_opt_in?: boolean
          wa_phone_verified?: boolean
        }
        Update: {
          allergie?: string | null
          avviso_personale?: string | null
          blocked?: boolean
          cognome?: string
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          patch_test?: string | null
          punti?: number
          segmento?: string
          tags?: Json | null
          telefono?: string | null
          tier?: string
          totale_speso?: number | null
          totale_visite?: number | null
          ultima_visita?: string | null
          updated_at?: string
          wa_last_seen?: string | null
          wa_opt_in?: boolean
          wa_phone_verified?: boolean
        }
        Relationships: []
      }
      competitor_updates: {
        Row: {
          competitor_id: string
          created_at: string
          data_rilevazione: string
          engagement_rate: number | null
          follower: number | null
          freq_settimanale: number | null
          id: string
          note: string | null
          post_totali: number | null
        }
        Insert: {
          competitor_id: string
          created_at?: string
          data_rilevazione?: string
          engagement_rate?: number | null
          follower?: number | null
          freq_settimanale?: number | null
          id?: string
          note?: string | null
          post_totali?: number | null
        }
        Update: {
          competitor_id?: string
          created_at?: string
          data_rilevazione?: string
          engagement_rate?: number | null
          follower?: number | null
          freq_settimanale?: number | null
          id?: string
          note?: string | null
          post_totali?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_updates_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "social_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_pricing_rules: {
        Row: {
          adjust_kind: string
          adjust_type: string
          adjust_value: number
          attivo: boolean
          created_at: string
          data_fine: string | null
          data_inizio: string | null
          descrizione: string | null
          giorni_settimana: number[]
          id: string
          nome: string
          ora_fine: string | null
          ora_inizio: string | null
          priorita: number
          servizi_target: string[]
          updated_at: string
        }
        Insert: {
          adjust_kind: string
          adjust_type: string
          adjust_value: number
          attivo?: boolean
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          descrizione?: string | null
          giorni_settimana?: number[]
          id?: string
          nome: string
          ora_fine?: string | null
          ora_inizio?: string | null
          priorita?: number
          servizi_target?: string[]
          updated_at?: string
        }
        Update: {
          adjust_kind?: string
          adjust_type?: string
          adjust_value?: number
          attivo?: boolean
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          descrizione?: string | null
          giorni_settimana?: number[]
          id?: string
          nome?: string
          ora_fine?: string | null
          ora_inizio?: string | null
          priorita?: number
          servizi_target?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          attivo: boolean
          categoria: string
          costo_punti: number
          created_at: string
          descrizione: string | null
          id: string
          immagine_url: string | null
          nome: string
          scadenza_giorni: number | null
        }
        Insert: {
          attivo?: boolean
          categoria?: string
          costo_punti: number
          created_at?: string
          descrizione?: string | null
          id?: string
          immagine_url?: string | null
          nome: string
          scadenza_giorni?: number | null
        }
        Update: {
          attivo?: boolean
          categoria?: string
          costo_punti?: number
          created_at?: string
          descrizione?: string | null
          id?: string
          immagine_url?: string | null
          nome?: string
          scadenza_giorni?: number | null
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          attivo: boolean
          euro_per_punto: number
          id: string
          punti_compleanno: number
          punti_referral: number
          scadenza_punti_giorni: number | null
          soglia_gold: number
          soglia_silver: number
          soglia_vip: number
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          euro_per_punto?: number
          id?: string
          punti_compleanno?: number
          punti_referral?: number
          scadenza_punti_giorni?: number | null
          soglia_gold?: number
          soglia_silver?: number
          soglia_vip?: number
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          euro_per_punto?: number
          id?: string
          punti_compleanno?: number
          punti_referral?: number
          scadenza_punti_giorni?: number | null
          soglia_gold?: number
          soglia_silver?: number
          soglia_vip?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          created_by_email: string | null
          descrizione: string | null
          id: string
          punti: number
          reward_id: string | null
          saldo_dopo: number | null
          tipo: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          created_by_email?: string | null
          descrizione?: string | null
          id?: string
          punti: number
          reward_id?: string | null
          saldo_dopo?: number | null
          tipo: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          created_by_email?: string | null
          descrizione?: string | null
          id?: string
          punti?: number
          reward_id?: string | null
          saldo_dopo?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_automations: {
        Row: {
          attivo: boolean
          body: string
          canale: string
          created_at: string
          id: string
          nome: string
          trigger_config: Json
          trigger_tipo: string
          ultima_esecuzione: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          body: string
          canale: string
          created_at?: string
          id?: string
          nome: string
          trigger_config?: Json
          trigger_tipo: string
          ultima_esecuzione?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          body?: string
          canale?: string
          created_at?: string
          id?: string
          nome?: string
          trigger_config?: Json
          trigger_tipo?: string
          ultima_esecuzione?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          attivo: boolean
          canale: string
          categoria: string | null
          contenuto: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          attivo?: boolean
          canale: string
          categoria?: string | null
          contenuto: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          attivo?: boolean
          canale?: string
          categoria?: string | null
          contenuto?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          attivo: boolean
          codice: string
          created_at: string
          descrizione: string | null
          id: string
          max_usi: number | null
          segmenti_applicabili: Json | null
          tipo_sconto: string
          usi_correnti: number
          validita_a: string | null
          validita_da: string | null
          valore_sconto: number
        }
        Insert: {
          attivo?: boolean
          codice: string
          created_at?: string
          descrizione?: string | null
          id?: string
          max_usi?: number | null
          segmenti_applicabili?: Json | null
          tipo_sconto: string
          usi_correnti?: number
          validita_a?: string | null
          validita_da?: string | null
          valore_sconto: number
        }
        Update: {
          attivo?: boolean
          codice?: string
          created_at?: string
          descrizione?: string | null
          id?: string
          max_usi?: number | null
          segmenti_applicabili?: Json | null
          tipo_sconto?: string
          usi_correnti?: number
          validita_a?: string | null
          validita_da?: string | null
          valore_sconto?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          attivo: boolean
          categoria: string | null
          created_at: string
          descrizione: string | null
          giacenza: number
          id: string
          image_url: string | null
          nome: string
          prezzo: number
          soglia_alert: number | null
        }
        Insert: {
          attivo?: boolean
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          giacenza?: number
          id?: string
          image_url?: string | null
          nome: string
          prezzo: number
          soglia_alert?: number | null
        }
        Update: {
          attivo?: boolean
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          giacenza?: number
          id?: string
          image_url?: string | null
          nome?: string
          prezzo?: number
          soglia_alert?: number | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          costo_unitario: number
          created_at: string
          id: string
          nome_prodotto: string
          product_id: string | null
          purchase_order_id: string
          quantita: number
          quantita_ricevuta: number
        }
        Insert: {
          costo_unitario: number
          created_at?: string
          id?: string
          nome_prodotto: string
          product_id?: string | null
          purchase_order_id: string
          quantita: number
          quantita_ricevuta?: number
        }
        Update: {
          costo_unitario?: number
          created_at?: string
          id?: string
          nome_prodotto?: string
          product_id?: string | null
          purchase_order_id?: string
          quantita?: number
          quantita_ricevuta?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          data_consegna_attesa: string | null
          data_consegna_effettiva: string | null
          data_ordine: string
          id: string
          importo_totale: number
          note: string | null
          numero_ordine: string | null
          stato: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_consegna_attesa?: string | null
          data_consegna_effettiva?: string | null
          data_ordine: string
          id?: string
          importo_totale?: number
          note?: string | null
          numero_ordine?: string | null
          stato?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_consegna_attesa?: string | null
          data_consegna_effettiva?: string | null
          data_ordine?: string
          id?: string
          importo_totale?: number
          note?: string | null
          numero_ordine?: string | null
          stato?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          label: string | null
          last_seen: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          label?: string | null
          last_seen?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          label?: string | null
          last_seen?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          appointment_id: string | null
          canale: string
          clicked_at: string | null
          client_id: string
          created_at: string
          feedback_text: string | null
          id: string
          rating: number | null
          redirected_google: boolean
          sent_at: string
          submitted_at: string | null
          token: string
        }
        Insert: {
          appointment_id?: string | null
          canale?: string
          clicked_at?: string | null
          client_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          redirected_google?: boolean
          sent_at?: string
          submitted_at?: string | null
          token: string
        }
        Update: {
          appointment_id?: string | null
          canale?: string
          clicked_at?: string | null
          client_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          redirected_google?: boolean
          sent_at?: string
          submitted_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_messages: {
        Row: {
          canale: string
          client_id: string
          contenuto: string
          id: string
          inviato_at: string
          inviato_da: string | null
          stato: string
          template_id: string | null
        }
        Insert: {
          canale: string
          client_id: string
          contenuto: string
          id?: string
          inviato_at?: string
          inviato_da?: string | null
          stato?: string
          template_id?: string | null
        }
        Update: {
          canale?: string
          client_id?: string
          contenuto?: string
          id?: string
          inviato_at?: string
          inviato_da?: string | null
          stato?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_inviato_da_fkey"
            columns: ["inviato_da"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_followup_rules: {
        Row: {
          attivo: boolean
          created_at: string
          id: string
          message_template: string
          offset_hours: number
          service_id: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          id?: string
          message_template: string
          offset_hours: number
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          id?: string
          message_template?: string
          offset_hours?: number
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_followup_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          attivo: boolean
          categoria: string
          created_at: string
          descrizione: string | null
          durata: number
          id: string
          nome: string
          prezzo: number
        }
        Insert: {
          attivo?: boolean
          categoria: string
          created_at?: string
          descrizione?: string | null
          durata: number
          id?: string
          nome: string
          prezzo: number
        }
        Update: {
          attivo?: boolean
          categoria?: string
          created_at?: string
          descrizione?: string | null
          durata?: number
          id?: string
          nome?: string
          prezzo?: number
        }
        Relationships: []
      }
      social_competitors: {
        Row: {
          created_at: string
          engagement_rate: number | null
          follower: number | null
          freq_settimanale: number | null
          handle: string
          id: string
          nome: string
          note: string | null
          piattaforma: string
          post_totali: number | null
          ultimo_aggiornamento: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          engagement_rate?: number | null
          follower?: number | null
          freq_settimanale?: number | null
          handle: string
          id?: string
          nome: string
          note?: string | null
          piattaforma?: string
          post_totali?: number | null
          ultimo_aggiornamento?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          engagement_rate?: number | null
          follower?: number | null
          freq_settimanale?: number | null
          handle?: string
          id?: string
          nome?: string
          note?: string | null
          piattaforma?: string
          post_totali?: number | null
          ultimo_aggiornamento?: string | null
          url?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          caption: string | null
          created_at: string
          data_pubblicazione: string | null
          hashtags: Json | null
          id: string
          keyword: string | null
          media_url: string | null
          piattaforma: string
          script: string | null
          stato: string
          tipo_contenuto: string
          titolo: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          data_pubblicazione?: string | null
          hashtags?: Json | null
          id?: string
          keyword?: string | null
          media_url?: string | null
          piattaforma: string
          script?: string | null
          stato?: string
          tipo_contenuto: string
          titolo: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          data_pubblicazione?: string | null
          hashtags?: Json | null
          id?: string
          keyword?: string | null
          media_url?: string | null
          piattaforma?: string
          script?: string | null
          stato?: string
          tipo_contenuto?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          attiva: boolean
          avatar_url: string | null
          cognome: string | null
          colore: string
          created_at: string
          email: string | null
          giorni_lavoro: number[] | null
          id: string
          nome: string
          note: string | null
          obiettivo_mensile: number | null
          orario_fine: string
          orario_inizio: string
          ruolo: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attiva?: boolean
          avatar_url?: string | null
          cognome?: string | null
          colore?: string
          created_at?: string
          email?: string | null
          giorni_lavoro?: number[] | null
          id?: string
          nome: string
          note?: string | null
          obiettivo_mensile?: number | null
          orario_fine?: string
          orario_inizio?: string
          ruolo?: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attiva?: boolean
          avatar_url?: string | null
          cognome?: string | null
          colore?: string
          created_at?: string
          email?: string | null
          giorni_lavoro?: number[] | null
          id?: string
          nome?: string
          note?: string | null
          obiettivo_mensile?: number | null
          orario_fine?: string
          orario_inizio?: string
          ruolo?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_ferie: {
        Row: {
          created_at: string
          data_fine: string
          data_inizio: string
          id: string
          note: string | null
          staff_id: string
          stato: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data_fine: string
          data_inizio: string
          id?: string
          note?: string | null
          staff_id: string
          stato?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data_fine?: string
          data_inizio?: string
          id?: string
          note?: string | null
          staff_id?: string
          stato?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_ferie_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_presenze: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          data: string
          id: string
          note: string | null
          staff_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          data: string
          id?: string
          note?: string | null
          staff_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_presenze_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_turni: {
        Row: {
          created_at: string
          data: string
          id: string
          note: string | null
          ora_fine: string
          ora_inizio: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          note?: string | null
          ora_fine: string
          ora_inizio: string
          staff_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          ora_fine?: string
          ora_inizio?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_turni_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          attivo: boolean
          created_at: string
          descrizione: string | null
          id: string
          nome: string
          prezzo: number
          sedute_totali: number
          servizi_inclusi: Json | null
          updated_at: string
          validita_giorni: number | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
          prezzo: number
          sedute_totali: number
          servizi_inclusi?: Json | null
          updated_at?: string
          validita_giorni?: number | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
          prezzo?: number
          sedute_totali?: number
          servizi_inclusi?: Json | null
          updated_at?: string
          validita_giorni?: number | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          attivo: boolean
          codice_fiscale: string | null
          created_at: string
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          partita_iva: string | null
          referente: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          codice_fiscale?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          partita_iva?: string | null
          referente?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          codice_fiscale?: string | null
          created_at?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          partita_iva?: string | null
          referente?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          created_at: string
          generated_voucher_id: string | null
          id: string
          kind: string
          label: string
          quantity: number
          ref_id: string | null
          staff_id: string | null
          transaction_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          generated_voucher_id?: string | null
          id?: string
          kind: string
          label: string
          quantity?: number
          ref_id?: string | null
          staff_id?: string | null
          transaction_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          generated_voucher_id?: string | null
          id?: string
          kind?: string
          label?: string
          quantity?: number
          ref_id?: string | null
          staff_id?: string | null
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_generated_voucher_id_fkey"
            columns: ["generated_voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          categoria: string | null
          client_id: string | null
          created_at: string
          data: string
          descrizione: string | null
          id: string
          importo: number
          metodo_pagamento: string | null
          tipo: string
        }
        Insert: {
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          data: string
          descrizione?: string | null
          id?: string
          importo: number
          metodo_pagamento?: string | null
          tipo: string
        }
        Update: {
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          data?: string
          descrizione?: string | null
          id?: string
          importo?: number
          metodo_pagamento?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_programs: {
        Row: {
          attivo: boolean
          categoria: string | null
          created_at: string
          descrizione: string | null
          id: string
          nome: string
          prezzo: number
          sedute: number
          servizi: Json | null
        }
        Insert: {
          attivo?: boolean
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
          prezzo: number
          sedute: number
          servizi?: Json | null
        }
        Update: {
          attivo?: boolean
          categoria?: string | null
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
          prezzo?: number
          sedute?: number
          servizi?: Json | null
        }
        Relationships: []
      }
      users: {
        Row: {
          attivo: boolean
          auth_id: string | null
          cognome: string
          created_at: string
          email: string
          id: string
          nome: string
          ruolo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          auth_id?: string | null
          cognome: string
          created_at?: string
          email: string
          id?: string
          nome: string
          ruolo?: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          auth_id?: string | null
          cognome?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          ruolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          acquistato_da_id: string | null
          appointment_id: string | null
          codice: string
          created_at: string
          data_scadenza: string | null
          data_uso: string | null
          descrizione: string | null
          destinatario_id: string | null
          id: string
          product_id: string | null
          service_id: string | null
          tipo: string
          usato: boolean
          valore: number
        }
        Insert: {
          acquistato_da_id?: string | null
          appointment_id?: string | null
          codice: string
          created_at?: string
          data_scadenza?: string | null
          data_uso?: string | null
          descrizione?: string | null
          destinatario_id?: string | null
          id?: string
          product_id?: string | null
          service_id?: string | null
          tipo?: string
          usato?: boolean
          valore: number
        }
        Update: {
          acquistato_da_id?: string | null
          appointment_id?: string | null
          codice?: string
          created_at?: string
          data_scadenza?: string | null
          data_uso?: string | null
          descrizione?: string | null
          destinatario_id?: string | null
          id?: string
          product_id?: string | null
          service_id?: string | null
          tipo?: string
          usato?: boolean
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_acquistato_da_id_fkey"
            columns: ["acquistato_da_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_bot_documents: {
        Row: {
          attivo: boolean
          categoria: string
          contenuto: string
          created_at: string
          id: string
          ordine: number
          titolo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          categoria?: string
          contenuto: string
          created_at?: string
          id?: string
          ordine?: number
          titolo: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          categoria?: string
          contenuto?: string
          created_at?: string
          id?: string
          ordine?: number
          titolo?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          meta_message_id: string | null
          role: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          meta_message_id?: string | null
          role: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          meta_message_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_buffer: {
        Row: {
          content: string
          id: string
          phone: string
          processed_at: string | null
          received_at: string
        }
        Insert: {
          content: string
          id?: string
          phone: string
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          content?: string
          id?: string
          phone?: string
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      wa_templates_meta: {
        Row: {
          approved_at: string | null
          body: string
          category: string
          created_at: string
          id: string
          language: string
          meta_template_name: string
        }
        Insert: {
          approved_at?: string | null
          body: string
          category: string
          created_at?: string
          id?: string
          language?: string
          meta_template_name: string
        }
        Update: {
          approved_at?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          language?: string
          meta_template_name?: string
        }
        Relationships: []
      }
      wa_threads: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          unread_count: number
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_count?: number
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_threads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_loyalty_points_atomic: {
        Args: { p_client_id: string; p_delta: number }
        Returns: {
          punti_after: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      increment_client_totals: {
        Args: {
          p_client_id: string
          p_speso_delta?: number
          p_visite_delta?: number
        }
        Returns: {
          totale_speso: number
          totale_visite: number
        }[]
      }
      insert_wallet_transaction_atomic: {
        Args: {
          p_appointment_id?: string
          p_client_id: string
          p_created_by?: string
          p_descrizione: string
          p_importo: number
          p_tipo: string
          p_transaction_id?: string
        }
        Returns: {
          id: string
          saldo_dopo: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ============================================
// Helper aliases (Fior di Loto custom)
// ============================================

type PublicSchema = Database["public"];

export type TableRow<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TableInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TableUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
