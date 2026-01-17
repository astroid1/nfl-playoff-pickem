'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useWeeklyLeaderboard } from '@/lib/hooks/useWeeklyLeaderboard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface WeeklyLeaderboardTableProps {
  season: number
  weekNumber: number
  showAllPlayers?: boolean
}

export function WeeklyLeaderboardTable({ season, weekNumber, showAllPlayers = false }: WeeklyLeaderboardTableProps) {
  const { user } = useAuth()
  const { data, isLoading } = useWeeklyLeaderboard(season, weekNumber, showAllPlayers)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading week {weekNumber} standings...</p>
      </div>
    )
  }

  const standings = data?.standings || []
  const totalGames = data?.totalGames || 0

  if (standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No picks made for week {weekNumber} yet.</p>
      </div>
    )
  }

  const getMedalEmoji = (rank: number, hasPoints: boolean) => {
    if (!hasPoints) return null // No medals until points are scored
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    return null
  }

  // Check if any points have been scored in this round
  const roundHasPoints = standings.some((s: any) => s.total_points > 0)

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 md:w-16">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">Picks</TableHead>
            <TableHead className="text-right">Pts</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Correct</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Incorrect</TableHead>
            <TableHead className="text-right hidden md:table-cell">Pending</TableHead>
            <TableHead className="text-right hidden md:table-cell">Win %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(standings as any[]).map((stat: any) => {
            const rank = stat.rank // Use calculated rank that accounts for ties
            const totalCompleted = stat.total_correct + stat.total_incorrect
            const winRate = totalCompleted > 0
              ? Math.round((stat.total_correct / totalCompleted) * 100)
              : 0
            const isCurrentUser = user?.id === stat.user_id
            const medal = getMedalEmoji(rank, roundHasPoints)
            const picksMade = stat.picks_made || 0
            const picksComplete = picksMade === totalGames && totalGames > 0

            return (
              <TableRow
                key={stat.user_id}
                className={isCurrentUser ? 'bg-primary/5 font-medium' : ''}
              >
                <TableCell className="py-2 md:py-4">
                  <div className="flex items-center gap-1">
                    {roundHasPoints ? (
                      <>
                        {medal && <span className="text-lg">{medal}</span>}
                        {!medal && <span className="font-medium">#{rank}</span>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 md:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="truncate max-w-[120px] sm:max-w-none">{stat.username}</span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center py-2 md:py-4">
                  <span className={picksComplete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {picksMade}/{totalGames}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2 md:py-4">
                  <span className="font-bold text-lg">{stat.total_points}</span>
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400 hidden sm:table-cell">
                  {stat.total_correct}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400 hidden sm:table-cell">
                  {stat.total_incorrect}
                </TableCell>
                <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                  {stat.total_pending}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell">
                  {totalCompleted > 0 ? `${winRate}%` : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
