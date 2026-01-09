'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function usePoolPicks(weekNumber?: number, season?: number) {
  const supabase = createClient()
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  return useQuery({
    queryKey: ['pool-picks', currentSeason, weekNumber],
    queryFn: async () => {
      // Fetch all picks for the week
      // RLS will automatically filter to show only picks for locked games
      let query = supabase
        .from('picks')
        .select(`
          *,
          profile:profiles(id, username, display_name),
          game:games(
            *,
            home_team:teams!home_team_id(*),
            away_team:teams!away_team_id(*),
            playoff_round:playoff_rounds(*)
          )
        `)
        .eq('season', currentSeason)

      if (weekNumber) {
        query = query.eq('week_number', weekNumber)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    refetchInterval: 60000, // Refetch every minute
  })
}

export function usePoolPicksByGame(gameId: number) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['pool-picks-game', gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          *,
          profile:profiles(id, username, display_name)
        `)
        .eq('game_id', gameId)

      if (error) throw error
      return data || []
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
