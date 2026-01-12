import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LiveScoreboard } from '@/components/dashboard/LiveScoreboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Alex's Pigskin Picks",
  description: "Alex's Pigskin Picks",
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as any

  // Get current season (use NEXT_PUBLIC_ version to match client components)
  const currentSeason = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString())

  // Get user stats for current season
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('season', currentSeason)
    .single() as any

  // Get all profiles and stats to calculate rank (matching leaderboard logic exactly)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username')
    .order('username', { ascending: true })

  const { data: allStats } = await supabase
    .from('user_stats')
    .select('user_id, total_points, total_correct_picks, tiebreaker_difference')
    .eq('season', currentSeason)

  // Calculate user's rank (accounting for ties) - matching leaderboard logic exactly
  let userRank = 1
  let totalPlayers = allProfiles?.length || 0

  if (allProfiles) {
    // Create stats map
    const statsMap = new Map(allStats?.map(s => [s.user_id, s]) || [])

    // Build standings for all users (same as leaderboard)
    const standings = allProfiles.map(profile => {
      const userStats = statsMap.get(profile.id)
      return {
        user_id: profile.id,
        username: profile.username,
        total_points: userStats?.total_points || 0,
        total_correct_picks: userStats?.total_correct_picks || 0,
        tiebreaker_difference: userStats?.tiebreaker_difference ?? null,
      }
    })

    // Sort by points, then correct picks, then tiebreaker (matching leaderboard exactly)
    standings.sort((a, b) => {
      // First: sort by total points (higher is better)
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points
      }
      // Second: sort by total correct picks (higher is better)
      if (b.total_correct_picks !== a.total_correct_picks) {
        return b.total_correct_picks - a.total_correct_picks
      }
      // Third: sort by tiebreaker difference (lower is better)
      // Null values go to the end
      if (a.tiebreaker_difference === null && b.tiebreaker_difference === null) {
        // Both null - sort alphabetically by username for stable sort
        return a.username.localeCompare(b.username)
      }
      if (a.tiebreaker_difference === null) {
        return 1
      }
      if (b.tiebreaker_difference === null) {
        return -1
      }
      if (a.tiebreaker_difference !== b.tiebreaker_difference) {
        return a.tiebreaker_difference - b.tiebreaker_difference
      }
      // Same tiebreaker - sort alphabetically for stable sort
      return a.username.localeCompare(b.username)
    })

    // Calculate ranks with proper tie handling (matching leaderboard exactly)
    let currentRank = 1
    for (let i = 0; i < standings.length; i++) {
      if (i > 0) {
        const prev = standings[i - 1]
        const curr = standings[i]
        const isTied =
          curr.total_points === prev.total_points &&
          curr.total_correct_picks === prev.total_correct_picks &&
          curr.tiebreaker_difference === prev.tiebreaker_difference
        if (!isTied) {
          currentRank = i + 1
        }
      }
      if (standings[i].user_id === user.id) {
        userRank = currentRank
        break
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.username}!</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_points || 0}</div>
            <p className="text-xs text-muted-foreground">
              {currentSeason} Playoffs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correct Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_correct_picks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Out of {(stats?.total_correct_picks || 0) + (stats?.total_incorrect_picks || 0)} games
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && (stats.total_correct_picks + stats.total_incorrect_picks) > 0
                ? Math.round((stats.total_correct_picks / (stats.total_correct_picks + stats.total_incorrect_picks)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Accuracy this season
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{userRank}</div>
            <p className="text-xs text-muted-foreground">
              Out of {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Scoreboard */}
      <LiveScoreboard />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/picks">
              <Button className="w-full" size="lg">
                Make Your Picks
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="w-full">
                View Leaderboard
              </Button>
            </Link>
            <Link href="/pool-picks">
              <Button variant="outline" className="w-full">
                See Pool Picks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Season Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Wild Card (2 pts each)</span>
              <span className="font-bold">{stats?.wildcard_correct || 0} correct • {(stats?.wildcard_correct || 0) * 2} pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Divisional (3 pts each)</span>
              <span className="font-bold">{stats?.divisional_correct || 0} correct • {(stats?.divisional_correct || 0) * 3} pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Conference (4 pts each)</span>
              <span className="font-bold">{stats?.championship_correct || 0} correct • {(stats?.championship_correct || 0) * 4} pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Super Bowl (5 pts each)</span>
              <span className="font-bold">{stats?.superbowl_correct || 0} correct • {(stats?.superbowl_correct || 0) * 5} pts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle>How to Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Pool Rules</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Entry Fee:</strong> $10 to play</li>
              <li><strong>Prizes:</strong> 70% first place, 30% second place</li>
              <li><strong>PayPal:</strong> thirt49@gmail.com (Please include your Pool username in the subject)</li>
              <li><strong>Venmo:</strong> @Grant-Hirt</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Making Your Picks</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>NO SPREADS</strong> - Just pick the winner straight up</li>
              <li>Pick the winner for each playoff game before it starts</li>
              <li>You can change your picks up until the game begins</li>
              <li>Once a game starts, your pick is locked in</li>
              <li>All picks must be made before kickoff</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Scoring System</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Wild Card Round:</strong> 2 points per correct pick</li>
              <li><strong>Divisional Round:</strong> 3 points per correct pick</li>
              <li><strong>Conference Championships:</strong> 4 points per correct pick</li>
              <li><strong>Super Bowl:</strong> 5 points per correct pick</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Winning &amp; Tiebreakers</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>The player with the most points at the end of the playoffs wins</li>
              <li><strong>1st Tiebreaker:</strong> Most total correct picks</li>
              <li><strong>2nd Tiebreaker:</strong> Super Bowl total points guess - the absolute difference between your guess and the actual total score (lower is better)</li>
              <li>Track your progress on the leaderboard throughout the playoffs</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Example: If you guess 45 total points and the final score is 28-32 (total 60), your tiebreaker difference is 15.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Important Notes</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>No picks = No points for that game</li>
              <li>Picks are visible to other players after games start</li>
              <li>Check the Pool Picks page to see what others picked</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
