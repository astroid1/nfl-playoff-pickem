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
  }
}
