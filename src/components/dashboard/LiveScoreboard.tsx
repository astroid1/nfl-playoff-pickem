'use client'

import { useGames, useCurrentWeek } from '@/lib/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatInTimeZone } from 'date-fns-tz'

const ET_TIMEZONE = 'America/New_York'

export function LiveScoreboard() {
  const { data: currentWeek } = useCurrentWeek()
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())
  const { data: games, isLoading } = useGames(currentWeek, currentSeason)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading scores...</p>
        </CardContent>
      </Card>
    )
  }

  if (!games || games.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No games scheduled</p>
        </CardContent>
      </Card>
    )
  }

  const liveGames = games.filter((g: any) => g.status === 'in_progress')
  const upcomingGames = games.filter((g: any) => g.status === 'scheduled' && !g.is_locked)
  const finalGames = games.filter((g: any) => g.status === 'final')

  const formatGameTime = (isoTime: string) => {
    try {
      return formatInTimeZone(
        new Date(isoTime),
        ET_TIMEZONE,
        'EEE h:mm a'
      )
    } catch {
      return ''
    }
  }

  const getStatusBadge = (game: any) => {
    if (game.status === 'final') {
      return <Badge variant="secondary" className="text-xs">Final</Badge>
    }
    if (game.status === 'in_progress') {
      return <Badge variant="default" className="bg-green-600 text-xs animate-pulse">Live</Badge>
    }
    return null
  }

  const GameRow = ({ game }: { game: any }) => {
    const isLive = game.status === 'in_progress'
    const isFinal = game.status === 'final'
    const showScores = isLive || isFinal

    return (
      <div className={`py-3 ${isLive ? 'bg-green-500/5 -mx-4 px-4 rounded-lg' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{game.playoff_round.name}</span>
          {getStatusBadge(game)}
          {!showScores && (
            <span className="text-xs text-muted-foreground">
              {formatGameTime(game.scheduled_start_time)}
            </span>
          )}
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
            <span className={`text-sm ${isFinal && game.away_team_score > game.home_team_score ? 'font-bold' : ''}`}>
              {game.away_team.abbreviation}
            </span>
          </div>
          {showScores && (
            <span className={`text-sm tabular-nums ${isFinal && game.away_team_score > game.home_team_score ? 'font-bold' : ''}`}>
              {game.away_team_score ?? 0}
            </span>
          )}
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
            <span className={`text-sm ${isFinal && game.home_team_score > game.away_team_score ? 'font-bold' : ''}`}>
              {game.home_team.abbreviation}
            </span>
          </div>
          {showScores && (
            <span className={`text-sm tabular-nums ${isFinal && game.home_team_score > game.away_team_score ? 'font-bold' : ''}`}>
              {game.home_team_score ?? 0}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          Live Scores
          {liveGames.length > 0 && (
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {/* Live Games First */}
        {liveGames.map((game: any) => (
          <GameRow key={game.id} game={game} />
        ))}

        {/* Final Games */}
        {finalGames.map((game: any) => (
          <GameRow key={game.id} game={game} />
        ))}

        {/* Upcoming Games */}
        {upcomingGames.map((game: any) => (
          <GameRow key={game.id} game={game} />
        ))}

        {games.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No games this week
          </p>
        )}
      </CardContent>
    </Card>
  )
}
