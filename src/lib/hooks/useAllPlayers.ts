'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useAllPlayers() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['all-players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, created_at')
        .order('username', { ascending: true })

      if (error) throw error
      return data || []
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
