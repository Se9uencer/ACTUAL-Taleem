export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assignment_students: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_students_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_students_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "assignment_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string | null
          created_at: string | null
          due_date: string | null
          end_ayah: number | null
          id: string
          start_ayah: number | null
          surah: string | null
          surah_name: string | null
          teacher_id: string | null
          title: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          end_ayah?: number | null
          id?: string
          start_ayah?: number | null
          surah?: string | null
          surah_name?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          end_ayah?: number | null
          id?: string
          start_ayah?: number | null
          surah?: string | null
          surah_name?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_performance_summary"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points: number | null
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points?: number | null
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points?: number | null
        }
        Relationships: []
      }
      class_deletion_logs: {
        Row: {
          class_name: string
          created_at: string | null
          deleted_by: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          message: string
          student_id: string | null
        }
        Insert: {
          class_name: string
          created_at?: string | null
          deleted_by?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          message: string
          student_id?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string | null
          deleted_by?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          message?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_deletion_logs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_deletion_logs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_deletion_logs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_deletion_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_deletion_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_deletion_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          enrollment_status: string
          id: string
          joined_at: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          enrollment_status?: string
          id?: string
          joined_at?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          enrollment_status?: string
          id?: string
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class_performance_summary"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          grade_level: string
          id: string
          name: string
          school_id: string | null
          start_date: string | null
          status: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          class_code?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_level: string
          id?: string
          name: string
          school_id?: string | null
          start_date?: string | null
          status?: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          class_code?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_level?: string
          id?: string
          name?: string
          school_id?: string | null
          start_date?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      feedback: {
        Row: {
          accuracy: number | null
          id: string
          notes: string | null
          recitation_id: string | null
        }
        Insert: {
          accuracy?: number | null
          id?: string
          notes?: string | null
          recitation_id?: string | null
        }
        Update: {
          accuracy?: number | null
          id?: string
          notes?: string | null
          recitation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_recitation_id_fkey"
            columns: ["recitation_id"]
            isOneToOne: false
            referencedRelation: "recitations"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_child_link: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_link_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_link_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parent_child_link_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parent_child_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parent_child_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          grade: string | null
          id: string
          last_name: string | null
          parent_email: string | null
          parent_phone: string | null
          role: string | null
          school_id: string | null
          student_id: string | null
          theme_accent_color: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          grade?: string | null
          id: string
          last_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          role?: string | null
          school_id?: string | null
          student_id?: string | null
          theme_accent_color?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          grade?: string | null
          id?: string
          last_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          role?: string | null
          school_id?: string | null
          student_id?: string | null
          theme_accent_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      recitations: {
        Row: {
          assignment_id: string | null
          audio_url: string | null
          id: string
          is_late: boolean | null
          is_late_submission: boolean | null
          is_latest: boolean | null
          student_id: string | null
          submitted_at: string | null
          transcription: string | null
          transcription_date: string | null
          transcription_error: string | null
          transcription_status: string | null
          verse_feedback: Json | null
        }
        Insert: {
          assignment_id?: string | null
          audio_url?: string | null
          id?: string
          is_late?: boolean | null
          is_late_submission?: boolean | null
          is_latest?: boolean | null
          student_id?: string | null
          submitted_at?: string | null
          transcription?: string | null
          transcription_date?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
          verse_feedback?: Json | null
        }
        Update: {
          assignment_id?: string | null
          audio_url?: string | null
          id?: string
          is_late?: boolean | null
          is_late_submission?: boolean | null
          is_latest?: boolean | null
          student_id?: string | null
          submitted_at?: string | null
          transcription?: string | null
          transcription_date?: string | null
          transcription_error?: string | null
          transcription_status?: string | null
          verse_feedback?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recitations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recitations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "recitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "recitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      schools: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schools_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          student_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          student_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          assignments_completed: number | null
          assignments_late: number | null
          assignments_total: number | null
          average_accuracy: number | null
          class_id: string
          id: string
          last_submission_at: string | null
          student_id: string
          total_points: number | null
          updated_at: string
        }
        Insert: {
          assignments_completed?: number | null
          assignments_late?: number | null
          assignments_total?: number | null
          average_accuracy?: number | null
          class_id: string
          id?: string
          last_submission_at?: string | null
          student_id: string
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          assignments_completed?: number | null
          assignments_late?: number | null
          assignments_total?: number | null
          average_accuracy?: number | null
          class_id?: string
          id?: string
          last_submission_at?: string | null
          student_id?: string
          total_points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      student_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          last_login: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      class_performance_summary: {
        Row: {
          average_accuracy: number | null
          class_id: string | null
          class_name: string | null
          teacher_id: string | null
          total_assignments: number | null
          total_students: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "recent_student_activity"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "student_assignment_status"
            referencedColumns: ["student_id"]
          },
        ]
      }
      recent_student_activity: {
        Row: {
          accuracy: number | null
          assignment_title: string | null
          first_name: string | null
          last_name: string | null
          student_id: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      student_assignment_status: {
        Row: {
          accuracy: number | null
          assignment_id: string | null
          assignment_title: string | null
          due_date: string | null
          first_name: string | null
          last_name: string | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
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