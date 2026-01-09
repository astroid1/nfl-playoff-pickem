'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useGames(weekNumber?: number, season?: number) {
  const supabase = createClient()
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  const query = useQuery({
    queryKey: ['games', season, weekNumber],
    queryFn: async () => {
      let query = supabase
        .from('games')
        .select(`
          *,
          home_team:teams!home_team_id(*),
          away_team:teams!away_team_id(*),
          playoff_round:playoff_rounds(*)
        `)
        .eq('season', currentSeason)
        .order('scheduled_start_time')

      if (weekNumber) {
        query = query.eq('week_number', weekNumber)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    refetchInterval: 60000, // Refetch every minute to check for game updates
  })

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: weekNumber ? `week_number=eq.${weekNumber}` : undefined,
        },
        () => {
          // Refetch games when changes occur
          query.refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [weekNumber, supabase, query])

  return query
}

export function useCurrentWeek() {
  const supabase = createClient()
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  return useQuery({
    queryKey: ['current-week', currentSeason],
    queryFn: async () => {
      // Get the earliest game that hasn't finished yet
      const { data } = await supabase
        .from('games')
        .select('week_number')
        .eq('season', currentSeason)
        .neq('status', 'final')
        .order('scheduled_start_time')
        .limit(1)
        .single()

      return data?.week_number || 1
    },
  })
}
