'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatInTimeZone } from 'date-fns-tz'
import { toast } from 'sonner'
import { HelpCircle } from 'lucide-react'

interface Team {
  id: number
  city: string
  name: string
  abbreviation: string
  logo_url: string | null
}

interface Game {
  id: number
  scheduled_start_time: string
  is_locked: boolean
  status: string
  home_team_score: number | null
  away_team_score: number | null
  quarter: number | null
  game_clock: string | null
  home_team: Team
  away_team: Team
  playoff_round: {
    name: string
    points_per_correct_pick: number
  }
}

interface Pick {
  id?: number
  selected_team_id: number
  superbowl_total_points_guess?: number | null
}

interface GameCardProps {
  game: Game
  currentPick?: Pick
  onPickChange: (gameId: number, teamId: number, superbowlTotalPointsGuess?: number | null) => Promise<void>
  disabled?: boolean
}

const ET_TIMEZONE = 'America/New_York'

export function GameCard({ game, currentPick, onPickChange, disabled = false }: GameCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(currentPick?.selected_team_id)
  const [totalPointsGuess, setTotalPointsGuess] = useState<string>(
    currentPick?.superbowl_total_points_guess?.toString() || ''
  )
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  const isSuperBowl = game.playoff_round.name === 'Super Bowl'

  // Update selected team when currentPick changes (e.g., when navigating back to page)
  useEffect(() => {
    setSelectedTeam(currentPick?.selected_team_id)
    setTotalPointsGuess(currentPick?.superbowl_total_points_guess?.toString() || '')
  }, [currentPick?.selected_team_id, currentPick?.superbowl_total_points_guess])

  // Set current time on client side to avoid hydration mismatch
  // Also update every 30 seconds to catch games that just started
  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check if game has started based on scheduled time (not just API status or is_locked flag)
  const scheduledTime = new Date(game.scheduled_start_time)
  const hasGameTimeStarted = currentTime ? scheduledTime <= currentTime : false

  // Game is effectively locked if: is_locked flag is set OR scheduled time has passed
  const isLocked = game.is_locked || hasGameTimeStarted
  const isInProgress = game.status === 'in_progress'
  const isFinal = game.status === 'final'

  const handleSelectTeam = async (teamId: number) => {
    if (isLocked || disabled) {
      toast.error('Game has started - picks are locked!')
      return
    }

    if (selectedTeam === teamId && !isSuperBowl) {
      return // Already selected (for non-Super Bowl games)
    }

    setIsSubmitting(true)
    try {
      const pointsGuess = isSuperBowl && totalPointsGuess
        ? parseInt(totalPointsGuess, 10)
        : null
      await onPickChange(game.id, teamId, pointsGuess)
      setSelectedTeam(teamId)
      toast.success('Pick saved!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save pick')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTotalPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setTotalPointsGuess(value)
    }
  }

  const handleTotalPointsBlur = async () => {
    if (isLocked || disabled || !selectedTeam) return

    const newGuess = totalPointsGuess ? parseInt(totalPointsGuess, 10) : null
    const currentGuess = currentPick?.superbowl_total_points_guess ?? null

    // Only save if the value changed
    if (newGuess !== currentGuess) {
      setIsSubmitting(true)
      try {
        await onPickChange(game.id, selectedTeam, newGuess)
        toast.success('Tiebreaker saved!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to save tiebreaker')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const formatGameTime = (isoTime: string) => {
    try {
      return formatInTimeZone(
        new Date(isoTime),
        ET_TIMEZONE,
        'EEE, MMM d • h:mm a zzz'
      )
    } catch {
      return isoTime
    }
  }

  // Format quarter display
  const formatQuarter = (quarter: number | null | undefined): string => {
    if (!quarter) return ''
    if (quarter <= 4) return `Q${quarter}`
    return 'OT'
  }

  const getStatusBadge = () => {
    if (isFinal) {
      return <Badge variant="secondary">Final</Badge>
    }
    if (isInProgress) {
      const quarterStr = game.quarter ? formatQuarter(game.quarter) : ''
      const clockStr = game.game_clock || ''
      const displayText = quarterStr && clockStr ? `${quarterStr} ${clockStr}` : 'Live'
      return <Badge variant="default" className="bg-green-600 animate-pulse">{displayText}</Badge>
    }
    if (isLocked) {
      return <Badge variant="destructive">Locked</Badge>
    }
    return <Badge variant="outline">Open</Badge>
  }

  const isGameStarted = isLocked || isInProgress || isFinal

  // Determine if the user's pick won (for final games)
  const getPickResult = () => {
    if (!isFinal || !selectedTeam || game.home_team_score === null || game.away_team_score === null) {
      return null
    }
    const winningTeamId = game.home_team_score > game.away_team_score
      ? game.home_team.id
      : game.away_team.id
    return selectedTeam === winningTeamId ? 'won' : 'lost'
  }

  const pickResult = getPickResult()

  return (
    <Card className={`${isGameStarted ? 'bg-muted/30' : ''} ${pickResult === 'won' ? 'ring-2 ring-green-500' : ''} ${pickResult === 'lost' ? 'ring-2 ring-red-500' : ''} transition-all`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <span className="text-xs font-medium text-primary">
              {game.playoff_round.points_per_correct_pick} pts
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatGameTime(game.scheduled_start_time)}
          </span>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {game.playoff_round.name}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Away Team */}
        <button
          onClick={() => handleSelectTeam(game.away_team.id)}
          disabled={isLocked || disabled || isSubmitting}
          className={`
            w-full p-4 rounded-lg border-2 transition-all
            ${selectedTeam === game.away_team.id
              ? 'border-primary bg-primary/10'
              : 'border-muted hover:border-primary/50'
            }
            ${isLocked || disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            disabled:hover:border-muted
          `}
        >
          <div className="flex items-center gap-4">
            {game.away_team.logo_url ? (
              <img
                src={game.away_team.logo_url}
                alt={`${game.away_team.city} ${game.away_team.name}`}
                className={`h-12 w-12 object-contain ${isGameStarted ? 'grayscale opacity-70' : ''}`}
              />
            ) : (
              <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${isGameStarted ? 'opacity-70' : ''}`}>
                <span className="text-xl font-bold">{game.away_team.abbreviation}</span>
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Away
              </div>
              <div className={`font-semibold ${isGameStarted ? 'text-muted-foreground' : ''}`}>
                {game.away_team.city} {game.away_team.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {game.away_team.abbreviation}
              </div>
            </div>
            {(isInProgress || isFinal) && game.away_team_score !== null && (
              <div className="text-2xl font-bold">
                {game.away_team_score}
              </div>
            )}
          </div>
        </button>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground px-2">VS</span>
        </div>

        {/* Home Team */}
        <button
          onClick={() => handleSelectTeam(game.home_team.id)}
          disabled={isLocked || disabled || isSubmitting}
          className={`
            w-full p-4 rounded-lg border-2 transition-all
            ${selectedTeam === game.home_team.id
              ? 'border-primary bg-primary/10'
              : 'border-muted hover:border-primary/50'
            }
            ${isLocked || disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            disabled:hover:border-muted
          `}
        >
          <div className="flex items-center gap-4">
            {game.home_team.logo_url ? (
              <img
                src={game.home_team.logo_url}
                alt={`${game.home_team.city} ${game.home_team.name}`}
                className={`h-12 w-12 object-contain ${isGameStarted ? 'grayscale opacity-70' : ''}`}
              />
            ) : (
              <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${isGameStarted ? 'opacity-70' : ''}`}>
                <span className="text-xl font-bold">{game.home_team.abbreviation}</span>
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Home
              </div>
              <div className={`font-semibold ${isGameStarted ? 'text-muted-foreground' : ''}`}>
                {game.home_team.city} {game.home_team.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {game.home_team.abbreviation}
              </div>
            </div>
            {(isInProgress || isFinal) && game.home_team_score !== null && (
              <div className="text-2xl font-bold">
                {game.home_team_score}
              </div>
            )}
          </div>
        </button>

        {/* Super Bowl Tiebreaker Input */}
        {isSuperBowl && (
          <TooltipProvider>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="total-points" className="text-sm font-medium">
                  Total Points Tiebreaker
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Guess the total combined points scored by both teams in the Super Bowl.
                      This is used as a tiebreaker if players have the same number of correct picks.
                      The winner is determined by the absolute difference between your guess and the actual total score (lower is better).
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs">
                      Example: If you guess 45 and the final score is 28-32 (total 60), your difference is 15.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="total-points"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter total points guess"
                value={totalPointsGuess}
                onChange={handleTotalPointsChange}
                onBlur={handleTotalPointsBlur}
                disabled={isLocked || disabled || isSubmitting}
                className="w-full"
              />
              {isLocked && totalPointsGuess && (
                <p className="text-xs text-muted-foreground mt-1">
                  Your guess: {totalPointsGuess} points
                </p>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Pick Result Banner */}
        {pickResult && (
          <div className={`mt-4 p-3 rounded-lg text-center font-semibold ${
            pickResult === 'won'
              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {pickResult === 'won' ? (
              <span>✓ Correct! +{game.playoff_round.points_per_correct_pick} points</span>
            ) : (
              <span>✗ Incorrect</span>
            )}
          </div>
        )}

        {/* Pick Status Message */}
        {!selectedTeam && !isLocked && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Select a team to make your pick
          </p>
        )}
        {isLocked && !selectedTeam && (
          <p className="text-xs text-center text-destructive pt-2">
            No pick made - game has started
          </p>
        )}
        {isSubmitting && (
          <p className="text-xs text-center text-primary pt-2">
            Saving pick...
          </p>
        )}
      </CardContent>
    </Card>
  )
}
