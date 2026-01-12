'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEnhancedLeaderboard } from '@/lib/hooks/useEnhancedLeaderboard'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function CurrentRankCard() {
  const { data: standings, isLoading } = useEnhancedLeaderboard()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  // Find user's rank from the leaderboard data
  const userStanding = standings?.find(s => s.user_id === userId)
  const userRank = userStanding?.rank ?? '-'
  const totalPlayers = standings?.length ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? '...' : `#${userRank}`}
        </div>
        <p className="text-xs text-muted-foreground">
          Out of {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  )
}
