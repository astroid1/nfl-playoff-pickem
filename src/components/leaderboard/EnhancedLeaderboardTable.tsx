'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useEnhancedLeaderboard } from '@/lib/hooks/useEnhancedLeaderboard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

export function EnhancedLeaderboardTable({ season }: { season?: number }) {
  const { user } = useAuth()
  const { data: standings, isLoading } = useEnhancedLeaderboard(season)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </div>
    )
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No players have joined yet.</p>
      </div>
    )
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    return null
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 md:w-16">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Pts</TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    Correct
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>1st Tiebreaker: Most total correct picks</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right hidden md:table-cell">Incorrect</TableHead>
              <TableHead className="text-right hidden md:table-cell">Win %</TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                <div className="flex items-center justify-end gap-1">
                  <span className="hidden lg:inline">2nd Tiebreaker</span>
                  <span className="lg:hidden">TB</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        <strong>2nd Tiebreaker (Super Bowl Points Guess):</strong>
                        <br />
                        Used only if players are tied on Points AND Correct Picks.
                        The winner is whoever is closest to the actual combined Super Bowl score.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(standings as any[]).map((stat: any, index) => {
              const rank = index + 1
              const totalGames = stat.total_correct_picks + stat.total_incorrect_picks
              const winRate = totalGames > 0
                ? Math.round((stat.total_correct_picks / totalGames) * 100)
                : 0
              const isCurrentUser = user?.id === stat.user_id
              const medal = getMedalEmoji(rank)
              const hasNoGames = totalGames === 0 && stat.total_pending_picks === 0

              return (
                <TableRow
                  key={stat.user_id}
                  className={isCurrentUser ? 'bg-primary/5 font-medium' : ''}
                >
                  <TableCell className="py-2 md:py-4">
                    <div className="flex items-center gap-1">
                      {medal && <span className="text-lg">{medal}</span>}
                      {!medal && <span className="font-medium">#{rank}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 md:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="truncate max-w-[120px] sm:max-w-none">{stat.profile?.username || 'Unknown'}</span>
                      <div className="flex gap-1">
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                        {hasNoGames && (
                          <Badge variant="outline" className="text-xs text-muted-foreground hidden sm:inline-flex">
                            No picks yet
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-2 md:py-4">
                    <span className="font-bold text-lg">{stat.total_points}</span>
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 hidden sm:table-cell">
                    {stat.total_correct_picks}
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400 hidden md:table-cell">
                    {stat.total_incorrect_picks}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    {totalGames > 0 ? `${winRate}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {stat.tiebreaker_difference !== null ? (
                      <span className="font-medium">{stat.tiebreaker_difference}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {/* Mobile info note */}
      <p className="text-xs text-muted-foreground mt-2 sm:hidden">
        Tap a row to see full details. Rotate device for more columns.
      </p>
    </TooltipProvider>
  )
}
