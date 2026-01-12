'use client'

import { use } from 'react'
import { PoolPicksGrid } from '@/components/pool-picks/PoolPicksGrid'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
          Picks are only visible after games start.
        </p>
      </div>

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
