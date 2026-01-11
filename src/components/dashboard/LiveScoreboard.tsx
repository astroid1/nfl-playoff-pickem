'use client'

import { useGames, useCurrentWeek } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LiveScoreboardProps {
  showAllGames?: boolean // If true, show all locked games for the week, not just live
  weekNumber?: number
}

// Format quarter display
function formatQuarter(quarter: number | null | undefined): string {
  if (!quarter) return ''
  if (quarter <= 4) return `Q${quarter}`
  return 'OT'
}

export function LiveScoreboard({ showAllGames = false, weekNumber }: LiveScoreboardProps) {
  const { data: currentWeek } = useCurrentWeek()
  const week = weekNumber ?? currentWeek
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())
  const { data: games, isLoading } = useGames(week, currentSeason)

  if (isLoading) {
    return null // Don't show anything while loading
  }

  if (!games || games.length === 0) {
    return null // Don't show if no games
  }

  // Filter games based on showAllGames prop
  let filteredGames = games
  if (!showAllGames) {
    // Only show live games on dashboard
    filteredGames = games.filter((g: any) => g.status === 'in_progress')
    if (filteredGames.length === 0) {
      return null
    }
  } else {
    // Show locked games (started or finished)
    filteredGames = games.filter((g: any) => g.is_locked)
    if (filteredGames.length === 0) {
      return null
    }
    // Sort by start time descending (most recent first)
    filteredGames = [...filteredGames].sort((a: any, b: any) => {
      return new Date(b.scheduled_start_time).getTime() - new Date(a.scheduled_start_time).getTime()
    })
  }

  const GameRow = ({ game }: { game: any }) => {
    const isLive = game.status === 'in_progress'
    const isFinal = game.status === 'final'

    // Determine winner for final games
    const homeWon = isFinal && (game.home_team_score ?? 0) > (game.away_team_score ?? 0)
    const awayWon = isFinal && (game.away_team_score ?? 0) > (game.home_team_score ?? 0)

    return (
      <div className={`py-3 ${isLive ? 'bg-green-500/5' : ''} -mx-4 px-4 rounded-lg`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{game.playoff_round?.name || 'Wild Card'}</span>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="default" className="bg-green-600 text-xs animate-pulse">
                {game.quarter && game.game_clock
                  ? `${formatQuarter(game.quarter)} ${game.game_clock}`
                  : 'Live'}
              </Badge>
            )}
            {isFinal && (
              <Badge variant="secondary" className="text-xs">Final</Badge>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div className={`flex items-center justify-between py-1 ${awayWon ? 'font-bold' : ''}`}>
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
            <span className={`text-sm ${awayWon ? 'text-foreground' : isFinal ? 'text-muted-foreground' : ''}`}>
              {game.away_team.abbreviation}
            </span>
          </div>
          <span className={`text-sm tabular-nums ${awayWon ? 'font-bold' : ''}`}>
            {game.away_team_score ?? 0}
          </span>
        </div>

        {/* Home Team */}
        <div className={`flex items-center justify-between py-1 ${homeWon ? 'font-bold' : ''}`}>
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
            <span className={`text-sm ${homeWon ? 'text-foreground' : isFinal ? 'text-muted-foreground' : ''}`}>
              {game.home_team.abbreviation}
            </span>
          </div>
          <span className={`text-sm tabular-nums ${homeWon ? 'font-bold' : ''}`}>
            {game.home_team_score ?? 0}
          </span>
        </div>
      </div>
    )
  }

  const hasLiveGames = games.some((g: any) => g.status === 'in_progress')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {showAllGames ? 'Scores' : 'Live Scores'}
          {hasLiveGames && (
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {filteredGames.map((game: any) => (
          <GameRow key={game.id} game={game} />
        ))}
      </CardContent>
    </Card>
  )
}
