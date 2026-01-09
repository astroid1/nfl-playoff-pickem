'use client'

import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LeaderboardPage() {
  const currentSeason = parseInt(
    process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString()
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you stack up against the competition
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentSeason} NFL Playoffs</CardTitle>
          <CardDescription>
            Rankings update automatically after each game. Tiebreaker: Most correct picks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable season={currentSeason} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring System</CardTitle>
          <CardDescription>
            Points are awarded based on the playoff round
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Wild Card</span>
              <span className="text-2xl font-bold text-primary">2 pts</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Divisional</span>
              <span className="text-2xl font-bold text-primary">3 pts</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Conference</span>
              <span className="text-2xl font-bold text-primary">4 pts</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Super Bowl</span>
              <span className="text-2xl font-bold text-primary">5 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
