'use client'

import { usePoolPicks } from '@/lib/hooks/usePoolPicks'
import { useGames } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PoolPicksGridProps {
  weekNumber: number
  season?: number
}

export function PoolPicksGrid({ weekNumber, season }: PoolPicksGridProps) {
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())
  const { data: poolPicks, isLoading: picksLoading } = usePoolPicks(weekNumber, currentSeason)
  const { data: games, isLoading: gamesLoading } = useGames(weekNumber, currentSeason)

  if (picksLoading || gamesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading pool picks...</p>
      </div>
    )
  }

  if (!games || games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No games found for this week.</p>
      </div>
    )
  }

  // Filter to only locked games
  const lockedGames = games.filter(g => g.is_locked)

  if (lockedGames.length === 0) {
    return (
      <div className="text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-2">
              No games have started yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Picks will be visible once games begin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get unique users who made picks
  const userMap = new Map()
    ; (poolPicks as any[])?.forEach(pick => {
      if (pick.profile && !userMap.has(pick.profile.id)) {
        userMap.set(pick.profile.id, pick.profile)
      }
    })
  const users = Array.from(userMap.values()) as any[]

  // Group picks by user and game
  const picksByUserAndGame = new Map<string, Map<number, any>>()
    ; (poolPicks as any[])?.forEach(pick => {
      if (!pick.profile) return

      if (!picksByUserAndGame.has(pick.profile.id)) {
        picksByUserAndGame.set(pick.profile.id, new Map())
      }
      picksByUserAndGame.get(pick.profile.id)!.set(pick.game_id, pick)
    })

  const getPickBadge = (pick: any, game: any) => {
    if (!pick) {
      return <Badge variant="outline" className="text-xs">No pick</Badge>
    }

    const selectedTeam = pick.selected_team_id === game.home_team.id
      ? game.home_team
      : game.away_team

    // Game status determines color
    if (game.status === 'final' && pick.is_correct !== null) {
      return (
        <Badge
          variant={pick.is_correct ? "default" : "destructive"}
          className={cn(
            "text-xs font-medium",
            pick.is_correct && "bg-green-600 hover:bg-green-700"
          )}
        >
          {selectedTeam.abbreviation} {pick.is_correct ? '✓' : '✗'}
        </Badge>
      )
    }

    // Game is in progress or locked but not final
    return (
      <Badge variant="secondary" className="text-xs">
        {selectedTeam.abbreviation}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Games List */}
      {lockedGames.map(game => (
        <Card key={game.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {game.away_team.abbreviation} @ {game.home_team.abbreviation}
              </CardTitle>
              <div className="flex items-center gap-2">
                {game.status === 'final' && (
                  <Badge variant="secondary">Final</Badge>
                )}
                {game.status === 'in_progress' && (
                  <Badge variant="default" className="bg-green-600">Live</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {game.playoff_round.points_per_correct_pick} pts
                </span>
              </div>
            </div>

            {/* Score display */}
            {(game.status === 'in_progress' || game.status === 'final') && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{game.away_team.city} {game.away_team.name}</span>
                  <span className="text-xl font-bold">{game.away_team_score}</span>
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{game.home_team.city} {game.home_team.name}</span>
                  <span className="text-xl font-bold">{game.home_team_score}</span>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* User picks for this game */}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(users as any[]).map(user => {
                const userPicks = picksByUserAndGame.get(user.id)
                const pick = userPicks?.get(game.id)

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <span className="text-sm font-medium truncate">
                      {user.username}
                    </span>
                    {getPickBadge(pick, game)}
                  </div>
                )
              })}
            </div>

            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No picks made for this game yet.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
