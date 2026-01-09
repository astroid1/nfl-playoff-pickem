'use client'

import { useState } from 'react'
import { EnhancedLeaderboardTable } from '@/components/leaderboard/EnhancedLeaderboardTable'
import { WeeklyLeaderboardTable } from '@/components/leaderboard/WeeklyLeaderboardTable'
import { PlayersTable } from '@/components/leaderboard/PlayersTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LeaderboardPage() {
  const currentSeason = parseInt(
    process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString()
  )
  const [selectedWeek, setSelectedWeek] = useState(1)

  const roundNames: Record<number, string> = {
    1: 'Wild Card',
    2: 'Divisional',
    3: 'Conference Championship',
    4: 'Super Bowl'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

      <Tabs defaultValue="overall" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="weekly">By Round</TabsTrigger>
          <TabsTrigger value="players" className="hidden">Players</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overall Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedLeaderboardTable season={currentSeason} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scoring System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Pool Rules</h3>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p><strong>Entry Fee:</strong> $10 to play. NO SPREADS.</p>
                  <p><strong>Prizes:</strong> 70% first place, 30% second place</p>
                  <p className="pt-2"><strong>Payment Options:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>PayPal to <span className="font-medium text-foreground">thirt49@gmail.com</span> (Please include your Pool username in the subject)</li>
                    <li>Venmo to <span className="font-medium text-foreground">@Grant-Hirt</span></li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Tiebreaker Rules</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If two or more players have the same total points and correct picks, the tiebreaker
                  determines the final ranking:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    <strong>Total Points</strong> - The player with more points wins
                  </li>
                  <li>
                    <strong>Correct Picks</strong> - If tied on points, the player with more correct picks wins
                  </li>
                  <li>
                    <strong>Super Bowl Total Points Guess</strong> - If still tied, the player whose
                    guess for the total combined points in the Super Bowl is closest to the actual
                    total wins. The tiebreaker value shown is the absolute difference between your
                    guess and the actual score (lower is better).
                  </li>
                </ol>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Example: If you guess 45 total points and the final score is 28-32 (total 60),
                  your tiebreaker difference would be 15.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{roundNames[selectedWeek]} Round Standings</CardTitle>
                </div>
                <Select
                  value={selectedWeek.toString()}
                  onValueChange={(value) => setSelectedWeek(parseInt(value))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select round" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Wild Card</SelectItem>
                    <SelectItem value="2">Divisional</SelectItem>
                    <SelectItem value="3">Conference</SelectItem>
                    <SelectItem value="4">Super Bowl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <WeeklyLeaderboardTable season={currentSeason} weekNumber={selectedWeek} />
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  )
}
