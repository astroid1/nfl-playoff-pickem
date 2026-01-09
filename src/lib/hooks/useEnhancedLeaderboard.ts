'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useEnhancedLeaderboard(season?: number) {
  const supabase = createClient()
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  return useQuery({
    queryKey: ['enhanced-leaderboard', currentSeason],
    queryFn: async () => {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .order('username', { ascending: true })

      if (profilesError) throw profilesError

      // Get user stats for the season
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('season', currentSeason)

      if (statsError) throw statsError

      // Create a map of user stats
      const statsMap = new Map(stats.map(s => [s.user_id, s]))

      // Merge profiles with stats, showing all users
      const standings = profiles.map(profile => {
        const userStats = statsMap.get(profile.id)
        return {
          user_id: profile.id,
          profile: {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          },
          total_points: userStats?.total_points || 0,
          total_correct_picks: userStats?.total_correct_picks || 0,
          total_incorrect_picks: userStats?.total_incorrect_picks || 0,
          total_pending_picks: userStats?.total_pending_picks || 0,
          wildcard_correct: userStats?.wildcard_correct || 0,
          divisional_correct: userStats?.divisional_correct || 0,
          championship_correct: userStats?.championship_correct || 0,
          superbowl_correct: userStats?.superbowl_correct || 0,
          tiebreaker_difference: userStats?.tiebreaker_difference ?? null,
          has_stats: !!userStats,
        }
      })

      // Sort by points, then by correct picks, then by tiebreaker (lower is better)
      standings.sort((a, b) => {
        // First: sort by total points (higher is better)
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points
        }
        // Second: sort by total correct picks (higher is better)
        if (b.total_correct_picks !== a.total_correct_picks) {
          return b.total_correct_picks - a.total_correct_picks
        }
        // Third: sort by tiebreaker difference (lower is better)
        // Null values go to the end
        if (a.tiebreaker_difference === null && b.tiebreaker_difference === null) {
          return 0
        }
        if (a.tiebreaker_difference === null) {
          return 1
        }
        if (b.tiebreaker_difference === null) {
          return -1
        }
        return a.tiebreaker_difference - b.tiebreaker_difference
      })

      return standings
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
