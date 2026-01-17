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

      // Get all picks for the specified week
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select(`
          user_id,
          is_correct,
          points_earned,
          profile:profiles(username, display_name, avatar_url)
        `)
        .eq('season', season)
        .eq('week_number', weekNumber)

      if (picksError) throw picksError

      // Aggregate picks by user
      const userStats = picks.reduce((acc: any, pick: any) => {
        const userId = pick.user_id
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            username: pick.profile?.username || 'Unknown',
            display_name: pick.profile?.display_name,
            avatar_url: pick.profile?.avatar_url,
            total_points: 0,
            total_correct: 0,
            total_incorrect: 0,
            total_pending: 0,
            picks_made: 0,
            has_picks: true,
          }
        }

        // Count every pick
        acc[userId].picks_made++

        if (pick.is_correct === true) {
          acc[userId].total_correct++
          acc[userId].total_points += pick.points_earned || 0
        } else if (pick.is_correct === false) {
          acc[userId].total_incorrect++
        } else {
          acc[userId].total_pending++
        }

        return acc
      }, {})

      // If showAllPlayers is enabled, fetch all profiles and merge
      if (showAllPlayers) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .order('username', { ascending: true })

        if (profilesError) throw profilesError

        // Add users who haven't made picks
        profiles.forEach((profile: any) => {
          if (!userStats[profile.id]) {
            userStats[profile.id] = {
              user_id: profile.id,
              username: profile.username || 'Unknown',
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              total_points: 0,
              total_correct: 0,
              total_incorrect: 0,
              total_pending: 0,
              picks_made: 0,
              has_picks: false,
            }
          }
        })
      }

      // Convert to array and sort
      const standings = Object.values(userStats).sort((a: any, b: any) => {
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
