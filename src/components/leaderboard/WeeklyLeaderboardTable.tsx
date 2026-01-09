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
}

export function WeeklyLeaderboardTable({ season, weekNumber }: WeeklyLeaderboardTableProps) {
  const { user } = useAuth()
  const { data: standings, isLoading } = useWeeklyLeaderboard(season, weekNumber)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading week {weekNumber} standings...</p>
      </div>
    )
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No picks made for week {weekNumber} yet.</p>
      </div>
    )
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Correct</TableHead>
            <TableHead className="text-right">Incorrect</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Win %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(standings as any[]).map((stat: any, index) => {
            const rank = index + 1
            const totalCompleted = stat.total_correct + stat.total_incorrect
            const winRate = totalCompleted > 0
              ? Math.round((stat.total_correct / totalCompleted) * 100)
              : 0
            const isCurrentUser = user?.id === stat.user_id
            const medal = getMedalEmoji(rank)

            return (
              <TableRow
                key={stat.user_id}
                className={isCurrentUser ? 'bg-primary/5 font-medium' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-1">
                    {medal && <span className="text-lg">{medal}</span>}
                    {!medal && <span className="font-medium">#{rank}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{stat.username}</span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-lg">{stat.total_points}</span>
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">
                  {stat.total_correct}
                </TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">
                  {stat.total_incorrect}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {stat.total_pending}
                </TableCell>
                <TableCell className="text-right">
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
