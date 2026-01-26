'use client'

import { use } from 'react'
import { GameCard } from '@/components/picks/GameCard'
import { useGames } from '@/lib/hooks/useGames'
import { usePicks, useSubmitPick } from '@/lib/hooks/usePicks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    week: string
  }>
}

export default function WeeklyPicksPage({ params }: PageProps) {
  const { week } = use(params)
  const weekNumber = parseInt(week)
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  const { data: games, isLoading: gamesLoading } = useGames(weekNumber, currentSeason)
  const { data: picks, isLoading: picksLoading } = usePicks(weekNumber)
  const submitPick = useSubmitPick()

  const handlePickChange = async (gameId: number, teamId: number, superbowlTotalPointsGuess?: number | null) => {
    const game = (games as any)?.find((g: any) => g.id === gameId)
    if (!game) throw new Error('Game not found')

    await submitPick.mutateAsync({
      gameId,
      teamId,
      season: currentSeason,
      weekNumber,
      superbowlTotalPointsGuess,
    })
  }

  if (gamesLoading || picksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading games...</p>
      </div>
    )
  }

  if (!games || games.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No Games Found</CardTitle>
            <CardDescription>
              There are no games scheduled for Week {weekNumber} yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Games will appear here once the playoff schedule is set.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group games by playoff round
  const gamesByRound = games.reduce((acc: any, game: any) => {
    const roundName = game.playoff_round.name
    if (!acc[roundName]) {
      acc[roundName] = []
    }
    acc[roundName].push(game)
    return acc
  }, {})

  const roundOrder = ['Wild Card', 'Divisional', 'Conference', 'Super Bowl']
  const sortedRounds = Object.keys(gamesByRound).sort(
    (a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b)
  )

  const roundNames: Record<number, string> = {
    1: 'Wild Card',
    2: 'Divisional',
    3: 'Conference Championship',
    4: 'Super Bowl'
  }

  const currentRoundName = roundNames[weekNumber] || `Week ${weekNumber}`

  // Calculate picks status
  const totalGames = games?.length || 0
  const picksMade = picks?.length || 0

  // For Super Bowl (week 4), also require tiebreaker to be set
  const isSuperBowlWeek = weekNumber === 4
  const superBowlPick = isSuperBowlWeek ? (picks as any[])?.find((p: any) => p.superbowl_total_points_guess != null) : null
  const tiebreakerComplete = !isSuperBowlWeek || (superBowlPick != null)

  const allPicksMade = picksMade === totalGames && totalGames > 0 && tiebreakerComplete

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{currentRoundName} Picks</h1>
          <p className="text-muted-foreground">
            Select your picks before the games start
          </p>
        </div>

        {/* Picks Status */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          allPicksMade
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}>
          {allPicksMade && <CheckCircle2 className="h-5 w-5" />}
          <span className="font-medium">
            {allPicksMade
              ? 'All picks saved!'
              : isSuperBowlWeek && picksMade === totalGames && !tiebreakerComplete
                ? 'Enter tiebreaker to complete'
                : `${picksMade}/${totalGames} picks made`
            }
          </span>
        </div>
      </div>

      {/* Games by Round */}
      {sortedRounds.map((roundName) => {
        const roundGames = gamesByRound[roundName]
        const roundInfo = roundGames[0].playoff_round

        return (
          <div key={roundName} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                {roundName !== currentRoundName && (
                  <h2 className="text-2xl font-bold">{roundName} Round</h2>
                )}
                <p className="text-sm text-muted-foreground">
                  {roundInfo.points_per_correct_pick} points per correct pick
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {roundGames.length} {roundGames.length === 1 ? 'game' : 'games'}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {roundGames.map((game: any) => {
                const currentPick = (picks as any)?.find((p: any) => p.game_id === game.id)
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    currentPick={currentPick}
                    onPickChange={handlePickChange}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t">
        {weekNumber > 1 && (
          <Link href={`/picks/${weekNumber - 1}`}>
            <Button variant="outline">← {roundNames[weekNumber - 1] || `Week ${weekNumber - 1}`}</Button>
          </Link>
        )}
        <div className="flex-1" />
        {weekNumber < 4 && (
          <Link href={`/picks/${weekNumber + 1}`}>
            <Button variant="outline">{roundNames[weekNumber + 1] || `Week ${weekNumber + 1}`} →</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
