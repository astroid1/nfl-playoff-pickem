// This file will be generated from Supabase schema
// Run: npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_sync_log: {
        Row: {
          id: number
          sync_type: string
          status: string
          api_provider: string
          records_updated: number
          error_message: string | null
          response_time_ms: number
          started_at: string
          completed_at: string
        }
        Insert: {
          id?: number
          sync_type: string
          status: string
          api_provider: string
          records_updated: number
          error_message?: string | null
          response_time_ms: number
          started_at: string
          completed_at?: string
        }
        Update: {
          id?: number
          sync_type?: string
          status?: string
          api_provider?: string
          records_updated?: number
          error_message?: string | null
          response_time_ms?: number
          started_at?: string
          completed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          email: string
          avatar_url: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          email: string
          avatar_url?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          email?: string
          avatar_url?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: number
          api_team_id: string
          city: string
          name: string
          abbreviation: string
          logo_url: string | null
          conference: string | null
          division: string | null
          created_at: string
        }
        Insert: {
          id?: number
          api_team_id: string
          city: string
          name: string
          abbreviation: string
          logo_url?: string | null
          conference?: string | null
          division?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          api_team_id?: string
          city?: string
          name?: string
          abbreviation?: string
          logo_url?: string | null
          conference?: string | null
          division?: string | null
          created_at?: string
        }
        Relationships: []
      }
      playoff_rounds: {
        Row: {
          id: number
          name: string
          points_per_correct_pick: number
          round_order: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          points_per_correct_pick: number
          round_order: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          points_per_correct_pick?: number
          round_order?: number
          created_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          id: number
          api_game_id: string
          season: number
          playoff_round_id: number
          week_number: number
          home_team_id: number
          away_team_id: number
          scheduled_start_time: string
          actual_start_time: string | null
          status: string
          is_locked: boolean
          locked_at: string | null
          home_team_score: number | null
          away_team_score: number | null
          winning_team_id: number | null
          last_updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          api_game_id: string
          season: number
          playoff_round_id: number
          week_number: number
          home_team_id: number
          away_team_id: number
          scheduled_start_time: string
          actual_start_time?: string | null
          status?: string
          is_locked?: boolean
          locked_at?: string | null
          home_team_score?: number | null
          away_team_score?: number | null
          winning_team_id?: number | null
          last_updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          api_game_id?: string
          season?: number
          playoff_round_id?: number
          week_number?: number
          home_team_id?: number
          away_team_id?: number
          scheduled_start_time?: string
          actual_start_time?: string | null
          status?: string
          is_locked?: boolean
          locked_at?: string | null
          home_team_score?: number | null
          away_team_score?: number | null
          winning_team_id?: number | null
          last_updated_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_playoff_round_id_fkey"
            columns: ["playoff_round_id"]
            isOneToOne: false
            referencedRelation: "playoff_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winning_team_id_fkey"
            columns: ["winning_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      picks: {
        Row: {
          id: number
          user_id: string
          game_id: number
          season: number
          week_number: number
          selected_team_id: number
          is_locked: boolean
          locked_at: string | null
          is_correct: boolean | null
          points_earned: number
          superbowl_total_points_guess: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          game_id: number
          season: number
          week_number: number
          selected_team_id: number
          is_locked?: boolean
          locked_at?: string | null
          is_correct?: boolean | null
          points_earned?: number
          superbowl_total_points_guess?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          game_id?: number
          season?: number
          week_number?: number
          selected_team_id?: number
          is_locked?: boolean
          locked_at?: string | null
          is_correct?: boolean | null
          points_earned?: number
          superbowl_total_points_guess?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_selected_team_id_fkey"
            columns: ["selected_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      user_stats: {
        Row: {
          id: number
          user_id: string
          season: number
          total_points: number
          total_correct_picks: number
          total_incorrect_picks: number
          total_pending_picks: number
          wildcard_correct: number
          divisional_correct: number
          championship_correct: number
          superbowl_correct: number
          tiebreaker_difference: number | null
          last_calculated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          season: number
          total_points?: number
          total_correct_picks?: number
          total_incorrect_picks?: number
          total_pending_picks?: number
          wildcard_correct?: number
          divisional_correct?: number
          championship_correct?: number
          superbowl_correct?: number
          tiebreaker_difference?: number | null
          last_calculated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          season?: number
          total_points?: number
          total_correct_picks?: number
          total_incorrect_picks?: number
          total_pending_picks?: number
          wildcard_correct?: number
          divisional_correct?: number
          championship_correct?: number
          superbowl_correct?: number
          tiebreaker_difference?: number | null
          last_calculated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      lock_picks_for_started_games: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_points_for_completed_games: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_user_stats: {
        Args: {
          p_season: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
