'use client'

import { use } from 'react'
import { PoolPicksGrid } from '@/components/pool-picks/PoolPicksGrid'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
  params: Promise<{
    week: string
  }>
}

export default function PoolPicksWeekPage({ params }: PageProps) {
  const { week } = use(params)
  const weekNumber = parseInt(week)
  const currentSeason = parseInt(
    process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || new Date().getFullYear().toString()
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pool-wide Picks - Week {weekNumber}</h1>
        <p className="text-muted-foreground">
          See everyone's picks for games that have started
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Picks are only visible after the game starts (locked status)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-600 text-white">
                  Team ✓
                </span> = Correct pick (game final)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-destructive text-white">
                  Team ✗
                </span> = Incorrect pick (game final)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary">
                  Team
                </span> = Pick pending (game in progress)
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Pool Picks Grid */}
      <PoolPicksGrid weekNumber={weekNumber} season={currentSeason} />

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t">
        {weekNumber > 1 && (
          <Link href={`/pool-picks/${weekNumber - 1}`}>
            <Button variant="outline">← Week {weekNumber - 1}</Button>
          </Link>
        )}
        <div className="flex-1" />
        {weekNumber < 4 && (
          <Link href={`/pool-picks/${weekNumber + 1}`}>
            <Button variant="outline">Week {weekNumber + 1} →</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
