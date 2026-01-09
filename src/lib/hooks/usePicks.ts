'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export function usePicks(weekNumber?: number) {
  const { user } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['picks', user?.id, weekNumber],
    queryFn: async () => {
      if (!user) return []

      let query = supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)

      if (weekNumber) {
        query = query.eq('week_number', weekNumber)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}

export function useSubmitPick() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gameId, teamId, season, weekNumber, superbowlTotalPointsGuess }: {
      gameId: number
      teamId: number
      season: number
      weekNumber: number
      superbowlTotalPointsGuess?: number | null
    }) => {
      if (!user) throw new Error('Must be logged in')

      // Check if pick already exists
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      if (existingPick) {
        // Update existing pick
        const updateData: { selected_team_id: number; superbowl_total_points_guess?: number | null } = {
          selected_team_id: teamId
        }
        // Only include superbowl_total_points_guess for Super Bowl (week 4)
        if (weekNumber === 4) {
          updateData.superbowl_total_points_guess = superbowlTotalPointsGuess ?? null
        }

        const { data, error } = await supabase
          .from('picks')
          .update(updateData)
          .eq('id', existingPick.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Insert new pick
        const insertData: {
          user_id: string
          game_id: number
          selected_team_id: number
          season: number
          week_number: number
          superbowl_total_points_guess?: number | null
        } = {
          user_id: user.id,
          game_id: gameId,
          selected_team_id: teamId,
          season,
          week_number: weekNumber,
        }
        // Only include superbowl_total_points_guess for Super Bowl (week 4)
        if (weekNumber === 4) {
          insertData.superbowl_total_points_guess = superbowlTotalPointsGuess ?? null
        }

        const { data, error } = await supabase
          .from('picks')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate picks queries to refetch
      queryClient.invalidateQueries({ queryKey: ['picks'] })
    },
    onError: (error) => {
      console.error('Failed to submit pick:', error)
    },
  })
}

export function useUpdateSuperbowlTiebreaker() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pickId, superbowlTotalPointsGuess }: {
      pickId: number
      superbowlTotalPointsGuess: number | null
    }) => {
      if (!user) throw new Error('Must be logged in')

      const { data, error } = await supabase
        .from('picks')
        .update({ superbowl_total_points_guess: superbowlTotalPointsGuess })
        .eq('id', pickId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picks'] })
    },
    onError: (error) => {
      console.error('Failed to update tiebreaker:', error)
    },
  })
}
