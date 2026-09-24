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
      pages: {
        Row: {
          created_at: string
          error: string | null
          id: string
          last_scanned_at: string | null
          source_id: string
          url: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          last_scanned_at?: string | null
          source_id: string
          url: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          last_scanned_at?: string | null
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_lock: {
        Row: {
          id: string
          locked_until: string
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          id: string
          locked_until: string
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          locked_until?: string
          paused_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          new_videos: number
          pages_scanned: number
          source_id: string | null
          started_at: string
          status: string
          videos_found: number
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          new_videos?: number
          pages_scanned?: number
          source_id?: string | null
          started_at?: string
          status?: string
          videos_found?: number
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          new_videos?: number
          pages_scanned?: number
          source_id?: string | null
          started_at?: string
          status?: string
          videos_found?: number
        }
        Relationships: [
          {
            foreignKeyName: "scan_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string | null
          last_scanned_at: string | null
          max_pages: number
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_scanned_at?: string | null
          max_pages?: number
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_scanned_at?: string | null
          max_pages?: number
          url?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          description: string | null
          duration_seconds: number | null
          embed_url: string
          first_seen_at: string
          id: string
          last_seen_at: string
          page_url: string | null
          provider: string
          published_at: string | null
          source_id: string | null
          thumbnail_url: string | null
          title: string | null
          watch_url: string | null
        }
        Insert: {
          description?: string | null
          duration_seconds?: number | null
          embed_url: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          page_url?: string | null
          provider?: string
          published_at?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          watch_url?: string | null
        }
        Update: {
          description?: string | null
          duration_seconds?: number | null
          embed_url?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          page_url?: string | null
          provider?: string
          published_at?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          watch_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
