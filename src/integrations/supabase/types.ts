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
      course_requests: {
        Row: {
          admin_reply: string | null
          body: string
          course_id: string | null
          created_at: string
          id: string
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          audience: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lang_code: string
          prompt_override: string | null
          published: boolean
          speed: number
          tech_depth: number | null
          title: string
          tone: string | null
          updated_at: string
          voice: string
        }
        Insert: {
          audience?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lang_code?: string
          prompt_override?: string | null
          published?: boolean
          speed?: number
          tech_depth?: number | null
          title: string
          tone?: string | null
          updated_at?: string
          voice?: string
        }
        Update: {
          audience?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lang_code?: string
          prompt_override?: string | null
          published?: boolean
          speed?: number
          tech_depth?: number | null
          title?: string
          tone?: string | null
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          last_slide_idx: number
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          last_slide_idx?: number
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          last_slide_idx?: number
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_logs: {
        Row: {
          course_id: string | null
          created_at: string
          detail: string | null
          duration_ms: number | null
          id: string
          kind: string
          model: string
          provider: string
          slide_count: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          detail?: string | null
          duration_ms?: number | null
          id?: string
          kind: string
          model: string
          provider: string
          slide_count?: number | null
          status: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          detail?: string | null
          duration_ms?: number | null
          id?: string
          kind?: string
          model?: string
          provider?: string
          slide_count?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          id: string
          scope: string
          template: string
          updated_at: string
        }
        Insert: {
          id?: string
          scope?: string
          template: string
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: string
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          course_id: string
          id: string
          score: number
          taken_at: string
          total: number
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          score: number
          taken_at?: string
          total: number
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          score?: number
          taken_at?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct: string
          course_id: string
          difficulty: string | null
          explanation: string | null
          hint: string | null
          id: string
          idx: number
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          prompt: string
          topic: string | null
        }
        Insert: {
          correct: string
          course_id: string
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          idx: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          prompt: string
          topic?: string | null
        }
        Update: {
          correct?: string
          course_id?: string
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          idx?: number
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          prompt?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_views: {
        Row: {
          course_id: string
          id: string
          slide_idx: number
          user_id: string
          viewed_at: string
        }
        Insert: {
          course_id: string
          id?: string
          slide_idx: number
          user_id: string
          viewed_at?: string
        }
        Update: {
          course_id?: string
          id?: string
          slide_idx?: number
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_views_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      slides: {
        Row: {
          body_md: string | null
          course_id: string
          created_at: string
          generation_hint: string | null
          icon_keywords: string[] | null
          id: string
          idx: number
          illustration_url: string | null
          image_url: string | null
          narration_text: string | null
          title: string
        }
        Insert: {
          body_md?: string | null
          course_id: string
          created_at?: string
          generation_hint?: string | null
          icon_keywords?: string[] | null
          id?: string
          idx: number
          illustration_url?: string | null
          image_url?: string | null
          narration_text?: string | null
          title?: string
        }
        Update: {
          body_md?: string | null
          course_id?: string
          created_at?: string
          generation_hint?: string | null
          icon_keywords?: string[] | null
          id?: string
          idx?: number
          illustration_url?: string | null
          image_url?: string | null
          narration_text?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      srt_cues: {
        Row: {
          course_id: string
          end_ms: number
          id: string
          idx: number
          start_ms: number
          text: string
        }
        Insert: {
          course_id: string
          end_ms: number
          id?: string
          idx: number
          start_ms: number
          text: string
        }
        Update: {
          course_id?: string
          end_ms?: number
          id?: string
          idx?: number
          start_ms?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "srt_cues_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
