'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentWeek } from '@/lib/hooks/useGames'

export default function PicksRedirectPage() {
  const router = useRouter()
  const { data: currentWeek, isLoading } = useCurrentWeek()

  useEffect(() => {
    if (currentWeek) {
      router.push(`/picks/${currentWeek}`)
    }
  }, [currentWeek, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return null
}
