'use client'

import { useGames, useCurrentWeek } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function LiveScoreboard() {
  const { data: currentWeek } = useCurrentWeek()
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())
  const { data: games, isLoading } = useGames(currentWeek, currentSeason)

  if (isLoading) {
    return null // Don't show anything while loading
  }

  if (!games || games.length === 0) {
    return null // Don't show if no games
  }

  // Only show live games
  const liveGames = games.filter((g: any) => g.status === 'in_progress')

  // If no live games, don't render the component at all
  if (liveGames.length === 0) {
    return null
  }

  const GameRow = ({ game }: { game: any }) => {
    return (
      <div className="py-3 bg-green-500/5 -mx-4 px-4 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{game.playoff_round.name}</span>
          <Badge variant="default" className="bg-green-600 text-xs animate-pulse">Live</Badge>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {game.away_team.logo_url ? (
              <img
                src={game.away_team.logo_url}
                alt={game.away_team.name}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold">{game.away_team.abbreviation}</span>
              </div>
            )}
            <span className="text-sm">
              {game.away_team.abbreviation}
            </span>
          </div>
          <span className="text-sm tabular-nums font-bold">
            {game.away_team_score ?? 0}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {game.home_team.logo_url ? (
              <img
                src={game.home_team.logo_url}
                alt={game.home_team.name}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold">{game.home_team.abbreviation}</span>
              </div>
            )}
            <span className="text-sm">
              {game.home_team.abbreviation}
            </span>
          </div>
          <span className="text-sm tabular-nums font-bold">
            {game.home_team_score ?? 0}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          Live Scores
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {liveGames.map((game: any) => (
          <GameRow key={game.id} game={game} />
        ))}
      </CardContent>
    </Card>
  )
}
