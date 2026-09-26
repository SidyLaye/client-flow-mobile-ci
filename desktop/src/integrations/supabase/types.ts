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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          access_status: string
          can_access_mobile: boolean | null
          can_access_web: boolean | null
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          last_mobile_login_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_status?: string
          can_access_mobile?: boolean | null
          can_access_web?: boolean | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_mobile_login_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_status?: string
          can_access_mobile?: boolean | null
          can_access_web?: boolean | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_mobile_login_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          assigned_admin_id: string | null
          business_activity: string | null
          company_name: string
          contact_first_name: string | null
          contact_last_name: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          fiscal_year_end: string | null
          id: string
          legal_form: string | null
          phone: string | null
          siren: string | null
          siret: string | null
          status: string
          tax_regime: string | null
          updated_at: string | null
          vat_frequency: string | null
          vat_number: string | null
          vat_regime: string | null
        }
        Insert: {
          address?: string | null
          assigned_admin_id?: string | null
          business_activity?: string | null
          company_name: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          legal_form?: string | null
          phone?: string | null
          siren?: string | null
          siret?: string | null
          status?: string
          tax_regime?: string | null
          updated_at?: string | null
          vat_frequency?: string | null
          vat_number?: string | null
          vat_regime?: string | null
        }
        Update: {
          address?: string | null
          assigned_admin_id?: string | null
          business_activity?: string | null
          company_name?: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          legal_form?: string | null
          phone?: string | null
          siren?: string | null
          siret?: string | null
          status?: string
          tax_regime?: string | null
          updated_at?: string | null
          vat_frequency?: string | null
          vat_number?: string | null
          vat_regime?: string | null
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          last_reminder_at: string | null
          priority: string | null
          requested_type: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          priority?: string | null
          requested_type?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          last_reminder_at?: string | null
          priority?: string | null
          requested_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          client_comment: string | null
          client_id: string
          created_at: string | null
          document_request_id: string | null
          file_name: string
          id: string
          internal_comment: string | null
          mime_type: string | null
          original_file_name: string | null
          period_month: number | null
          period_year: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          category?: string | null
          client_comment?: string | null
          client_id: string
          created_at?: string | null
          document_request_id?: string | null
          file_name: string
          id?: string
          internal_comment?: string | null
          mime_type?: string | null
          original_file_name?: string | null
          period_month?: number | null
          period_year?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          category?: string | null
          client_comment?: string | null
          client_id?: string
          created_at?: string | null
          document_request_id?: string | null
          file_name?: string
          id?: string
          internal_comment?: string | null
          mime_type?: string | null
          original_file_name?: string | null
          period_month?: number | null
          period_year?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_request_id_fkey"
            columns: ["document_request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          invoice_id: string
          label: string
          line_total_ht: number
          line_total_ttc: number
          position: number
          quantity: number
          unit: string | null
          unit_price_ht: number
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          label: string
          line_total_ht: number
          line_total_ttc: number
          position: number
          quantity: number
          unit?: string | null
          unit_price_ht: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          label?: string
          line_total_ht?: number
          line_total_ttc?: number
          position?: number
          quantity?: number
          unit?: string | null
          unit_price_ht?: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          client_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          due_date: string | null
          footer: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string | null
          original_invoice_id: string | null
          payment_status: string | null
          pdf_storage_path: string | null
          sent_at: string | null
          source_quote_id: string | null
          status: string
          subtotal_ht: number | null
          terms: string | null
          total_discount_ht: number | null
          total_ttc: number | null
          total_vat: number | null
          type: string
          updated_at: string | null
          validated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          footer?: string | null
          id?: string
          issue_date: string
          notes?: string | null
          number?: string | null
          original_invoice_id?: string | null
          payment_status?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          source_quote_id?: string | null
          status?: string
          subtotal_ht?: number | null
          terms?: string | null
          total_discount_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type: string
          updated_at?: string | null
          validated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          footer?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string | null
          original_invoice_id?: string | null
          payment_status?: string | null
          pdf_storage_path?: string | null
          sent_at?: string | null
          source_quote_id?: string | null
          status?: string
          subtotal_ht?: number | null
          terms?: string | null
          total_discount_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type?: string
          updated_at?: string | null
          validated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          read_at: string | null
          related_document_id: string | null
          related_request_id: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          read_at?: string | null
          related_document_id?: string | null
          related_request_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          read_at?: string | null
          related_document_id?: string | null
          related_request_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          related_client_id: string | null
          related_document_id: string | null
          related_invoice_id: string | null
          related_message_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_client_id?: string | null
          related_document_id?: string | null
          related_invoice_id?: string | null
          related_message_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_client_id?: string | null
          related_document_id?: string | null
          related_invoice_id?: string | null
          related_message_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_message_id_fkey"
            columns: ["related_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          bic: string | null
          company_name: string | null
          created_at: string | null
          credit_note_prefix: string | null
          default_footer: string | null
          default_late_penalty_rate: number | null
          default_recovery_fee: number | null
          default_terms: string | null
          email: string | null
          iban: string | null
          id: string
          invoice_prefix: string | null
          logo_storage_path: string | null
          phone: string | null
          quote_prefix: string | null
          siret: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_note_prefix?: string | null
          default_footer?: string | null
          default_late_penalty_rate?: number | null
          default_recovery_fee?: number | null
          default_terms?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_storage_path?: string | null
          phone?: string | null
          quote_prefix?: string | null
          siret?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string | null
          credit_note_prefix?: string | null
          default_footer?: string | null
          default_late_penalty_rate?: number | null
          default_recovery_fee?: number | null
          default_terms?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_storage_path?: string | null
          phone?: string | null
          quote_prefix?: string | null
          siret?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_owns_client: { Args: { _client_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
    Enums: {
      app_role: ["admin", "client"],
    },
  },
} as const
