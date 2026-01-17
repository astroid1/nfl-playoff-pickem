/**
 * API endpoint to get pick counts per user for a specific week
 * This uses the service role to bypass RLS and return aggregate data
 * without revealing actual picks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const season = parseInt(searchParams.get('season') || '2025')
    const weekNumber = parseInt(searchParams.get('week') || '1')

    if (isNaN(season) || isNaN(weekNumber)) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    try {
        const supabase = createServiceClient()

        // Get pick counts per user (aggregate only, no actual picks revealed)
        const { data: picks, error: picksError } = await supabase
            .from('picks')
            .select('user_id, is_correct, points_earned')
            .eq('season', season)
            .eq('week_number', weekNumber)

        if (picksError) {
            throw picksError
        }

        // Aggregate by user
        const pickCounts: Record<string, {
            user_id: string
            picks_made: number
            correct_picks: number
            incorrect_picks: number
            pending_picks: number
            total_points: number
        }> = {}

        picks.forEach((pick: any) => {
            const userId = pick.user_id
            if (!pickCounts[userId]) {
                pickCounts[userId] = {
                    user_id: userId,
                    picks_made: 0,
                    correct_picks: 0,
                    incorrect_picks: 0,
                    pending_picks: 0,
                    total_points: 0,
                }
            }

            pickCounts[userId].picks_made++

            if (pick.is_correct === true) {
                pickCounts[userId].correct_picks++
                pickCounts[userId].total_points += pick.points_earned || 0
            } else if (pick.is_correct === false) {
                pickCounts[userId].incorrect_picks++
            } else {
                pickCounts[userId].pending_picks++
            }
        })

        return NextResponse.json({
            season,
            weekNumber,
            pickCounts: Object.values(pickCounts),
        })

    } catch (error) {
        console.error('Error fetching pick counts:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
