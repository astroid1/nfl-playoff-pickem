'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useWeeklyLeaderboard(season: number, weekNumber: number, showAllPlayers: boolean = false) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['weekly-leaderboard', season, weekNumber, showAllPlayers],
    queryFn: async () => {
      // Get total games count for this week
      const { count: totalGames, error: gamesError } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('season', season)
        .eq('week_number', weekNumber)

      if (gamesError) throw gamesError

      // Fetch all profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .order('username', { ascending: true })

      if (profilesError) throw profilesError

      // Fetch pick counts from API (bypasses RLS to get all users' pick counts)
      const response = await fetch(`/api/pick-counts?season=${season}&week=${weekNumber}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pick counts')
      }
      const { pickCounts } = await response.json()

      // Create a map of user pick stats
      const pickCountsMap = new Map<string, any>()
      pickCounts.forEach((pc: any) => {
        pickCountsMap.set(pc.user_id, pc)
      })

      // Build user stats from profiles, merging with pick counts
      const userStats: Record<string, any> = {}

      profiles.forEach((profile: any) => {
        const pickData = pickCountsMap.get(profile.id)
        userStats[profile.id] = {
          user_id: profile.id,
          username: profile.username || 'Unknown',
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          total_points: pickData?.total_points || 0,
          total_correct: pickData?.correct_picks || 0,
          total_incorrect: pickData?.incorrect_picks || 0,
          total_pending: pickData?.pending_picks || 0,
          picks_made: pickData?.picks_made || 0,
          has_picks: (pickData?.picks_made || 0) > 0,
        }
      })

      // If not showing all players, filter to only those with picks
      let filteredStats = userStats
      if (!showAllPlayers) {
        filteredStats = Object.fromEntries(
          Object.entries(userStats).filter(([_, stat]) => stat.has_picks)
        )
      }

      // Convert to array and sort
      const standings = Object.values(filteredStats).sort((a: any, b: any) => {
        // Sort by points (higher is better)
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points
        }
        // Then by correct picks (higher is better)
        if (b.total_correct !== a.total_correct) {
          return b.total_correct - a.total_correct
        }
        // Then alphabetically by username for stable sort
        return a.username.localeCompare(b.username)
      })

      // Calculate proper ranks with ties
      let currentRank = 1
      const rankedStandings = standings.map((standing: any, index: number) => {
        if (index > 0) {
          const prev = standings[index - 1] as any
          const isTied =
            standing.total_points === prev.total_points &&
            standing.total_correct === prev.total_correct

          if (!isTied) {
            currentRank = index + 1
          }
        }
        return {
          ...standing,
          rank: currentRank,
        }
      })

      return {
        standings: rankedStandings,
        totalGames: totalGames || 0,
      }
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
