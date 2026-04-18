/**
 * Tipos generados manualmente desde el schema de Supabase.
 *
 * IMPORTANTE: Cuando el proyecto esté conectado a Supabase CLI, reemplazá
 * este archivo con tipos auto-generados ejecutando:
 *
 *   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > src/types/database.ts
 *
 * O con Supabase CLI instalado globalmente:
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de dominio (enums del schema)
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'therapist' | 'client' | 'supervisor'

export type RelationshipStatus = 'active' | 'paused' | 'ended'

export type DbtModule =
  | 'mindfulness'
  | 'distress_tolerance'
  | 'emotion_regulation'
  | 'interpersonal_effectiveness'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export type MessageType = 'encouragement' | 'validation' | 'reminder' | 'custom'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos JSONB (contenido descifrado)
// ─────────────────────────────────────────────────────────────────────────────

/** Contenido de diary_cards una vez descifrado */
export interface DiaryCardData {
  emotions: Record<string, number>         // ej: { tristeza: 7, ira: 3 }
  urges: Record<string, number>            // ej: { autolesion: 4, suicidio: 2 }
  skills_used: string[]                    // skill_codes usados
  skill_effectiveness: number              // 1-10
  notes: string
  custom_fields?: Record<string, Json>
}

/** Contenido de crisis_plans una vez descifrado */
export interface CrisisPlanData {
  warning_signs: string[]
  coping_strategies: string[]
  distractions: string[]
  reasons_to_live: string[]
  emergency_contacts: Array<{
    name: string
    phone: string
    relationship: string
  }>
  professional_help: Array<{
    name: string
    phone: string
  }>
  safe_environment_actions: string[]
}

/** Configuración de la plantilla de tarjeta diaria */
export interface DiaryCardTemplateConfig {
  emotions: string[]
  urges: string[]
  show_medications: boolean
  show_exercise: boolean
  show_sleep: boolean
  custom_fields?: Array<{
    key: string
    label: string
    type: 'boolean' | 'scale' | 'text'
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaz principal de la base de datos (estructura para createClient<Database>)
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ───────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          email: string
          avatar_url: string | null
          public_key: string | null        // llave pública para cifrado asimétrico
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name: string
          email: string
          avatar_url?: string | null
          public_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string
          email?: string
          avatar_url?: string | null
          public_key?: string | null
          updated_at?: string
        }
      }

      // ───────────────────────────────────────────────────────
      therapist_client_relationships: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          status: RelationshipStatus
          started_at: string
          ended_at: string | null
          shared_encryption_key: string | null
        }
        Insert: {
          id?: string
          therapist_id: string
          client_id: string
          status?: RelationshipStatus
          started_at?: string
          ended_at?: string | null
          shared_encryption_key?: string | null
        }
        Update: {
          status?: RelationshipStatus
          ended_at?: string | null
          shared_encryption_key?: string | null
        }
      }

      // ───────────────────────────────────────────────────────
      invitation_codes: {
        Row: {
          id: string
          code: string
          therapist_id: string
          used_by: string | null
          used_at: string | null
          expires_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          therapist_id: string
          used_by?: string | null
          used_at?: string | null
          expires_at: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          used_by?: string | null
          used_at?: string | null
        }
      }

      // ───────────────────────────────────────────────────────
      dbt_skills: {
        Row: {
          id: string
          module: DbtModule
          skill_name: string
          skill_code: string | null
          description: string
          instructions: string
          examples: Json | null
          order_in_module: number | null
          created_at: string
        }
        Insert: {
          id?: string
          module: DbtModule
          skill_name: string
          skill_code?: string | null
          description: string
          instructions: string
          examples?: Json | null
          order_in_module?: number | null
          created_at?: string
        }
        Update: {
          module?: DbtModule
          skill_name?: string
          skill_code?: string | null
          description?: string
          instructions?: string
          examples?: Json | null
          order_in_module?: number | null
        }
      }

      // ───────────────────────────────────────────────────────
      skill_worksheets: {
        Row: {
          id: string
          skill_id: string | null
          worksheet_name: string
          worksheet_number: string | null
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          skill_id?: string | null
          worksheet_name: string
          worksheet_number?: string | null
          content: Json
          created_at?: string
        }
        Update: {
          skill_id?: string | null
          worksheet_name?: string
          worksheet_number?: string | null
          content?: Json
        }
      }

      // ───────────────────────────────────────────────────────
      diary_cards: {
        Row: {
          id: string
          client_id: string
          date: string
          encrypted_data: string          // JSON cifrado con llave compartida
          encryption_iv: string           // vector de inicialización
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          date: string
          encrypted_data: string
          encryption_iv: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          encrypted_data?: string
          encryption_iv?: string
          updated_at?: string
        }
      }

      // ───────────────────────────────────────────────────────
      diary_card_templates: {
        Row: {
          id: string
          client_id: string
          therapist_id: string | null
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          therapist_id?: string | null
          config: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          therapist_id?: string | null
          config?: Json
          is_active?: boolean
          updated_at?: string
        }
      }

      // ───────────────────────────────────────────────────────
      crisis_plans: {
        Row: {
          id: string
          client_id: string
          encrypted_data: string
          encryption_iv: string
          last_modified_by: string | null
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          encrypted_data: string
          encryption_iv: string
          last_modified_by?: string | null
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          encrypted_data?: string
          encryption_iv?: string
          last_modified_by?: string | null
          version?: number
          is_active?: boolean
          updated_at?: string
        }
      }

      // ───────────────────────────────────────────────────────
      assigned_tasks: {
        Row: {
          id: string
          client_id: string
          therapist_id: string
          skill_id: string | null
          worksheet_id: string | null
          title: string
          description: string | null
          encrypted_notes: string | null
          encryption_iv: string | null
          due_date: string | null
          status: TaskStatus
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          therapist_id: string
          skill_id?: string | null
          worksheet_id?: string | null
          title: string
          description?: string | null
          encrypted_notes?: string | null
          encryption_iv?: string | null
          due_date?: string | null
          status?: TaskStatus
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          skill_id?: string | null
          worksheet_id?: string | null
          title?: string
          description?: string | null
          encrypted_notes?: string | null
          encryption_iv?: string | null
          due_date?: string | null
          status?: TaskStatus
          completed_at?: string | null
          updated_at?: string
        }
      }

      // ───────────────────────────────────────────────────────
      therapist_messages: {
        Row: {
          id: string
          therapist_id: string
          client_id: string
          encrypted_content: string
          encryption_iv: string
          message_type: MessageType
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          therapist_id: string
          client_id: string
          encrypted_content: string
          encryption_iv: string
          message_type?: MessageType
          read_at?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
      }

      // ───────────────────────────────────────────────────────
      crisis_activations: {
        Row: {
          id: string
          client_id: string
          crisis_plan_id: string | null
          steps_used: Json | null
          resolved: boolean | null
          encrypted_notes: string | null
          encryption_iv: string | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          crisis_plan_id?: string | null
          steps_used?: Json | null
          resolved?: boolean | null
          encrypted_notes?: string | null
          encryption_iv?: string | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          steps_used?: Json | null
          resolved?: boolean | null
          encrypted_notes?: string | null
          encryption_iv?: string | null
          ended_at?: string | null
        }
      }

      // ───────────────────────────────────────────────────────
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          target_user_id: string | null
          target_resource_type: string | null
          target_resource_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          target_user_id?: string | null
          target_resource_type?: string | null
          target_resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: never  // audit_log es inmutable
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      validate_invitation_code: {
        Args: { p_code: string }
        Returns: Array<{
          valid: boolean
          therapist_id: string | null
          error_msg: string | null
        }>
      }
      use_invitation_code: {
        Args: { p_code: string; p_consultant_id: string }
        Returns: boolean
      }
      generate_invitation_code: {
        Args: Record<string, never>
        Returns: string
      }
      is_my_consultant: {
        Args: { consultant_id: string }
        Returns: boolean
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }

    Enums: {
      [_ in never]: never
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de conveniencia para usar en componentes
// ─────────────────────────────────────────────────────────────────────────────

type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Profile                      = Tables<'profiles'>
export type TherapistClientRelationship  = Tables<'therapist_client_relationships'>
export type InvitationCode               = Tables<'invitation_codes'>
export type DbtSkill                     = Tables<'dbt_skills'>
export type SkillWorksheet               = Tables<'skill_worksheets'>
export type DiaryCard                    = Tables<'diary_cards'>
export type DiaryCardTemplate            = Tables<'diary_card_templates'>
export type CrisisPlan                   = Tables<'crisis_plans'>
export type AssignedTask                 = Tables<'assigned_tasks'>
export type TherapistMessage             = Tables<'therapist_messages'>
export type CrisisActivation             = Tables<'crisis_activations'>
export type AuditLog                     = Tables<'audit_log'>
