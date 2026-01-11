'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useGames } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PoolPicksGridProps {
  weekNumber: number
  season?: number
}

// Format quarter display
function formatQuarter(quarter: number | null | undefined): string {
  if (!quarter) return ''
  if (quarter <= 4) return `Q${quarter}`
  return 'OT'
}

// Component to display picks for a single game
function GamePicksCard({ game }: { game: any }) {
  const supabase = createClient()

  const { data: picks, isLoading } = useQuery({
    queryKey: ['game-picks', game.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          *,
          profile:profiles!inner(id, username, display_name),
          team:teams!selected_team_id(abbreviation, name)
        `)
        .eq('game_id', game.id)

      if (error) throw error
      return data || []
    },
    refetchInterval: 30000,
  })

  // Group picks by team
  const awayTeamPicks = picks?.filter(p => p.selected_team_id === game.away_team.id) || []
  const homeTeamPicks = picks?.filter(p => p.selected_team_id === game.home_team.id) || []

  return (
    <Card>
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
              <Badge variant="default" className="bg-green-600 animate-pulse">
                {game.quarter && game.game_clock
                  ? `${formatQuarter(game.quarter)} ${game.game_clock}`
                  : 'Live'}
              </Badge>
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
                <span className="text-xs text-green-600 font-medium animate-pulse">
                  {game.quarter && game.game_clock
                    ? `${formatQuarter(game.quarter)} ${game.game_clock}`
                    : 'LIVE'}
                </span>
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading picks...</p>
        ) : (
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
                  <div className="text-sm text-muted-foreground">{awayTeamPicks.length} pick{awayTeamPicks.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="space-y-1">
                {awayTeamPicks.length > 0 ? (
                  awayTeamPicks.map((pick: any) => (
                    <div key={pick.id} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate">{pick.profile?.display_name || pick.profile?.username || 'Unknown'}</span>
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
                  <div className="text-sm text-muted-foreground">{homeTeamPicks.length} pick{homeTeamPicks.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="space-y-1">
                {homeTeamPicks.length > 0 ? (
                  homeTeamPicks.map((pick: any) => (
                    <div key={pick.id} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate">{pick.profile?.display_name || pick.profile?.username || 'Unknown'}</span>
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
        )}

        {!isLoading && picks?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No picks made for this game yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function PoolPicksGrid({ weekNumber, season }: PoolPicksGridProps) {
  const currentSeason = season || parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())
  const { data: games, isLoading: gamesLoading } = useGames(weekNumber, currentSeason)

  if (gamesLoading) {
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

  // Filter to only locked games and sort by scheduled start time descending (most recent first)
  const lockedGames = games
    .filter(g => g.is_locked)
    .sort((a, b) => {
      const aTime = new Date(a.scheduled_start_time).getTime()
      const bTime = new Date(b.scheduled_start_time).getTime()
      return bTime - aTime
    })

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

  return (
    <div className="space-y-6">
      {lockedGames.map(game => (
        <GamePicksCard key={game.id} game={game} />
      ))}
    </div>
  )
}
