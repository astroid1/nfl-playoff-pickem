'use client'

import { usePoolPicks } from '@/lib/hooks/usePoolPicks'
import { useGames } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
              <div className="flex items-center justify-center gap-6 mt-2 py-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {game.away_team.logo_url && (
                    <img src={game.away_team.logo_url} alt={game.away_team.name} className="h-8 w-8 object-contain" />
                  )}
                  <div className="text-center">
                    <span className="text-sm font-medium block">{game.away_team.abbreviation}</span>
                    <span className={`text-2xl font-bold ${game.status === 'final' && (game.away_team_score ?? 0) > (game.home_team_score ?? 0) ? 'text-green-600' : ''}`}>
                      {game.away_team_score ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  {game.status === 'in_progress' && (
                    <span className="text-xs text-green-600 font-medium animate-pulse">LIVE</span>
                  )}
                  <span className="text-muted-foreground text-lg">-</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <span className="text-sm font-medium block">{game.home_team.abbreviation}</span>
                    <span className={`text-2xl font-bold ${game.status === 'final' && (game.home_team_score ?? 0) > (game.away_team_score ?? 0) ? 'text-green-600' : ''}`}>
                      {game.home_team_score ?? 0}
                    </span>
                  </div>
                  {game.home_team.logo_url && (
                    <img src={game.home_team.logo_url} alt={game.home_team.name} className="h-8 w-8 object-contain" />
                  )}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* Group picks by team */}
            {(() => {
              // Group users by their pick
              const awayTeamPickers: any[] = []
              const homeTeamPickers: any[] = []
              const noPickers: any[] = []

              users.forEach(user => {
                const userPicks = picksByUserAndGame.get(user.id)
                const pick = userPicks?.get(game.id)

                if (!pick) {
                  noPickers.push({ user, pick: null })
                } else if (pick.selected_team_id === game.away_team.id) {
                  awayTeamPickers.push({ user, pick })
                } else {
                  homeTeamPickers.push({ user, pick })
                }
              })

              return (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Away Team Picks */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                      {game.away_team.logo_url ? (
                        <img
                          src={game.away_team.logo_url}
                          alt={game.away_team.name}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-bold">{game.away_team.abbreviation}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{game.away_team.city} {game.away_team.name}</div>
                        <div className="text-sm text-muted-foreground">{awayTeamPickers.length} pick{awayTeamPickers.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {awayTeamPickers.length > 0 ? (
                        awayTeamPickers.map(({ user, pick }) => (
                          <div key={user.id} className="flex items-center justify-between text-sm py-1">
                            <span className="truncate">{user.username}</span>
                            {game.status === 'final' && pick.is_correct !== null && (
                              <span className={pick.is_correct ? 'text-green-600' : 'text-red-600'}>
                                {pick.is_correct ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No picks</p>
                      )}
                    </div>
                  </div>

                  {/* Home Team Picks */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                      {game.home_team.logo_url ? (
                        <img
                          src={game.home_team.logo_url}
                          alt={game.home_team.name}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-bold">{game.home_team.abbreviation}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{game.home_team.city} {game.home_team.name}</div>
                        <div className="text-sm text-muted-foreground">{homeTeamPickers.length} pick{homeTeamPickers.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {homeTeamPickers.length > 0 ? (
                        homeTeamPickers.map(({ user, pick }) => (
                          <div key={user.id} className="flex items-center justify-between text-sm py-1">
                            <span className="truncate">{user.username}</span>
                            {game.status === 'final' && pick.is_correct !== null && (
                              <span className={pick.is_correct ? 'text-green-600' : 'text-red-600'}>
                                {pick.is_correct ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No picks</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

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
