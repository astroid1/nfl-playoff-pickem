'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Team {
  id: number
  city: string
  name: string
  abbreviation: string
}

interface Pick {
  selected_team_id: number
  profile: {
    username: string
  }
}

interface PickDistributionProps {
  homeTeam: Team
  awayTeam: Team
  picks: Pick[]
}

export function PickDistribution({ homeTeam, awayTeam, picks }: PickDistributionProps) {
  const homePicks = picks.filter(p => p.selected_team_id === homeTeam.id)
  const awayPicks = picks.filter(p => p.selected_team_id === awayTeam.id)
  const totalPicks = picks.length

  if (totalPicks === 0) {
    return null
  }

  const homePercentage = Math.round((homePicks.length / totalPicks) * 100)
  const awayPercentage = Math.round((awayPicks.length / totalPicks) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pick Distribution</CardTitle>
        <CardDescription className="text-xs">
          {totalPicks} {totalPicks === 1 ? 'person' : 'people'} made picks for this game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Away Team */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {awayTeam.abbreviation}
            </span>
            <span className="text-muted-foreground">
              {awayPicks.length} ({awayPercentage}%)
            </span>
          </div>
          <Progress value={awayPercentage} className="h-2" />
        </div>

        {/* Home Team */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {homeTeam.abbreviation}
            </span>
            <span className="text-muted-foreground">
              {homePicks.length} ({homePercentage}%)
            </span>
          </div>
          <Progress value={homePercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
