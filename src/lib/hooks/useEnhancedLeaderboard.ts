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

      // Get Super Bowl picks to show the tiebreaker guess
      const { data: superBowlPicks, error: sbPicksError } = await supabase
        .from('picks')
        .select('user_id, superbowl_total_points_guess')
        .eq('season', currentSeason)
        .eq('week_number', 4)
        .not('superbowl_total_points_guess', 'is', null)

      if (sbPicksError) throw sbPicksError

      // Get Super Bowl game to calculate tiebreaker difference
      const { data: superBowlGame } = await supabase
        .from('games')
        .select('home_team_score, away_team_score, status')
        .eq('season', currentSeason)
        .eq('week_number', 4)
        .single()

      // Calculate actual total points (only if game has scores)
      const actualTotalPoints = superBowlGame &&
        superBowlGame.home_team_score !== null &&
        superBowlGame.away_team_score !== null
          ? superBowlGame.home_team_score + superBowlGame.away_team_score
          : null

      // Create a map of user stats
      const statsMap = new Map(stats.map(s => [s.user_id, s]))

      // Create a map of Super Bowl guesses
      const sbGuessMap = new Map(superBowlPicks?.map(p => [p.user_id, p.superbowl_total_points_guess]) || [])

      // Merge profiles with stats, showing all users
      const standings = profiles.map(profile => {
        const userStats = statsMap.get(profile.id)
        const sbGuess = sbGuessMap.get(profile.id)

        // Calculate tiebreaker difference dynamically
        let tiebreakerDiff: number | null = null
        if (actualTotalPoints !== null && sbGuess !== null && sbGuess !== undefined) {
          tiebreakerDiff = Math.abs(actualTotalPoints - sbGuess)
        }

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
          tiebreaker_difference: tiebreakerDiff,
          superbowl_total_points_guess: sbGuess ?? null,
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
          // Both null - sort alphabetically by username for stable sort
          return a.profile.username.localeCompare(b.profile.username)
        }
        if (a.tiebreaker_difference === null) {
          return 1
        }
        if (b.tiebreaker_difference === null) {
          return -1
        }
        if (a.tiebreaker_difference !== b.tiebreaker_difference) {
          return a.tiebreaker_difference - b.tiebreaker_difference
        }
        // Same tiebreaker - sort alphabetically for stable sort
        return a.profile.username.localeCompare(b.profile.username)
      })

      // Calculate proper ranks with ties
      // Users are tied if they have same points, correct picks, and tiebreaker
      let currentRank = 1
      const rankedStandings = standings.map((standing, index) => {
        if (index > 0) {
          const prev = standings[index - 1]
          const isTied =
            standing.total_points === prev.total_points &&
            standing.total_correct_picks === prev.total_correct_picks &&
            standing.tiebreaker_difference === prev.tiebreaker_difference

          if (!isTied) {
            // Not tied, so rank is position + 1 (accounts for all tied players above)
            currentRank = index + 1
          }
          // If tied, keep the same rank as previous
        }
        return {
          ...standing,
          rank: currentRank,
        }
      })

      return rankedStandings
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
