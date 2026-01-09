'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useLeaderboard(season?: number) {
  const supabase = createClient()
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  return useQuery({
    queryKey: ['leaderboard', currentSeason],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select(`
          *,
          profile:profiles(username, display_name, avatar_url)
        `)
        .eq('season', currentSeason)
        .order('total_points', { ascending: false })
        .order('total_correct_picks', { ascending: false }) // Tiebreaker

      if (error) throw error
      return data || []
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
