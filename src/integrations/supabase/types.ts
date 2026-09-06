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
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          answer_text: string
          approved_at: string | null
          created_at: string
          id: string
          member_id: string
          published_at: string | null
          question_id: string
          section: Database["public"]["Enums"]["community_section"]
          status: Database["public"]["Enums"]["answer_status"]
        }
        Insert: {
          answer_text: string
          approved_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          published_at?: string | null
          question_id: string
          section: Database["public"]["Enums"]["community_section"]
          status?: Database["public"]["Enums"]["answer_status"]
        }
        Update: {
          answer_text?: string
          approved_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          published_at?: string | null
          question_id?: string
          section?: Database["public"]["Enums"]["community_section"]
          status?: Database["public"]["Enums"]["answer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "answers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_admin_id: string | null
          actor_label: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event: string
          id: string
          member_id: string | null
          metadata: Json | null
        }
        Insert: {
          actor_admin_id?: string | null
          actor_label?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event: string
          id?: string
          member_id?: string | null
          metadata?: Json | null
        }
        Update: {
          actor_admin_id?: string | null
          actor_label?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event?: string
          id?: string
          member_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          delivered_at: string | null
          error_detail: string | null
          failed_at: string | null
          id: string
          member_id: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id: string | null
        }
        Insert: {
          broadcast_id: string
          delivered_at?: string | null
          error_detail?: string | null
          failed_at?: string | null
          id?: string
          member_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id?: string | null
        }
        Update: {
          broadcast_id?: string
          delivered_at?: string | null
          error_detail?: string | null
          failed_at?: string | null
          id?: string
          member_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          message_text: string
          recipient_count: number
          section: Database["public"]["Enums"]["community_section"] | null
          sent_at: string | null
          status: Database["public"]["Enums"]["broadcast_status"]
          target_type: Database["public"]["Enums"]["broadcast_target"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          message_text: string
          recipient_count?: number
          section?: Database["public"]["Enums"]["community_section"] | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          target_type: Database["public"]["Enums"]["broadcast_target"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          message_text?: string
          recipient_count?: number
          section?: Database["public"]["Enums"]["community_section"] | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["broadcast_status"]
          target_type?: Database["public"]["Enums"]["broadcast_target"]
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          blocked_at: string | null
          consent_accepted_at: string | null
          created_at: string
          display_name: string | null
          id: string
          internal_member_id: string
          last_message_at: string | null
          onboarding_step: string
          phone_number: string
          removed_at: string | null
          section: Database["public"]["Enums"]["community_section"] | null
          status: Database["public"]["Enums"]["member_status"]
          suspended_at: string | null
          updated_at: string
          verification_reference: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          whatsapp_user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          blocked_at?: string | null
          consent_accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          internal_member_id?: string
          last_message_at?: string | null
          onboarding_step?: string
          phone_number: string
          removed_at?: string | null
          section?: Database["public"]["Enums"]["community_section"] | null
          status?: Database["public"]["Enums"]["member_status"]
          suspended_at?: string | null
          updated_at?: string
          verification_reference?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          whatsapp_user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          blocked_at?: string | null
          consent_accepted_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          internal_member_id?: string
          last_message_at?: string | null
          onboarding_step?: string
          phone_number?: string
          removed_at?: string | null
          section?: Database["public"]["Enums"]["community_section"] | null
          status?: Database["public"]["Enums"]["member_status"]
          suspended_at?: string | null
          updated_at?: string
          verification_reference?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          whatsapp_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_detail: string | null
          failed_at: string | null
          id: string
          member_id: string | null
          message_text: string | null
          message_type: string
          read_at: string | null
          section: Database["public"]["Enums"]["community_section"] | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_detail?: string | null
          failed_at?: string | null
          id?: string
          member_id?: string | null
          message_text?: string | null
          message_type?: string
          read_at?: string | null
          section?: Database["public"]["Enums"]["community_section"] | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          error_detail?: string | null
          failed_at?: string | null
          id?: string
          member_id?: string | null
          message_text?: string | null
          message_type?: string
          read_at?: string | null
          section?: Database["public"]["Enums"]["community_section"] | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          member_id: string | null
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          member_id: string
          published_at: string | null
          question_reference: string
          question_text: string
          section: Database["public"]["Enums"]["community_section"]
          status: Database["public"]["Enums"]["question_status"]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          published_at?: string | null
          question_reference?: string
          question_text: string
          section: Database["public"]["Enums"]["community_section"]
          status?: Database["public"]["Enums"]["question_status"]
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          published_at?: string | null
          question_reference?: string
          question_text?: string
          section?: Database["public"]["Enums"]["community_section"]
          status?: Database["public"]["Enums"]["question_status"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_records: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string | null
          id: string
          member_id: string
          method: string
          otp_hash: string | null
          requested_section:
            | Database["public"]["Enums"]["community_section"]
            | null
          review_notes: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          member_id: string
          method?: string
          otp_hash?: string | null
          requested_section?:
            | Database["public"]["Enums"]["community_section"]
            | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          member_id?: string
          method?: string
          otp_hash?: string | null
          requested_section?:
            | Database["public"]["Enums"]["community_section"]
            | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_records_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      answer_status:
        | "pending"
        | "approved"
        | "rejected"
        | "published"
        | "hidden"
        | "deleted"
      app_role: "super_admin" | "admin" | "moderator"
      broadcast_status:
        | "draft"
        | "queued"
        | "sending"
        | "sent"
        | "partially_failed"
        | "failed"
      broadcast_target: "boys" | "girls" | "both" | "selected"
      community_section: "boys" | "girls"
      member_status:
        | "pending"
        | "verification_required"
        | "in_review"
        | "approved"
        | "suspended"
        | "blocked"
        | "removed"
      message_direction: "inbound" | "outbound"
      message_status:
        | "received"
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      question_status:
        | "pending"
        | "approved"
        | "rejected"
        | "published"
        | "hidden"
        | "closed"
        | "deleted"
      verification_status:
        | "pending"
        | "in_review"
        | "verified"
        | "rejected"
        | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      answer_status: [
        "pending",
        "approved",
        "rejected",
        "published",
        "hidden",
        "deleted",
      ],
      app_role: ["super_admin", "admin", "moderator"],
      broadcast_status: [
        "draft",
        "queued",
        "sending",
        "sent",
        "partially_failed",
        "failed",
      ],
      broadcast_target: ["boys", "girls", "both", "selected"],
      community_section: ["boys", "girls"],
      member_status: [
        "pending",
        "verification_required",
        "in_review",
        "approved",
        "suspended",
        "blocked",
        "removed",
      ],
      message_direction: ["inbound", "outbound"],
      message_status: [
        "received",
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      question_status: [
        "pending",
        "approved",
        "rejected",
        "published",
        "hidden",
        "closed",
        "deleted",
      ],
      verification_status: [
        "pending",
        "in_review",
        "verified",
        "rejected",
        "expired",
      ],
    },
  },
} as const
