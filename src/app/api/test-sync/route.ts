/**
 * Test endpoint to verify sync-scores functionality
 * Call this directly to test if the API and database are working
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAPIDAPI_BASE_URL = process.env.RAPIDAPI_NFL_BASE_URL || 'https://nfl-api-data.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'nfl-api-data.p.rapidapi.com'

export async function GET(request: NextRequest) {
    const results: string[] = []

    results.push('=== Environment Check ===')
    results.push(`RAPIDAPI_KEY set: ${!!RAPIDAPI_KEY}`)
    results.push(`RAPIDAPI_KEY length: ${RAPIDAPI_KEY?.length || 0}`)
    results.push(`RAPIDAPI_HOST: ${RAPIDAPI_HOST}`)
    results.push(`RAPIDAPI_BASE_URL: ${RAPIDAPI_BASE_URL}`)

    try {
        // Test Supabase connection
        results.push('')
        results.push('=== Supabase Test ===')
        const supabase = await createClient()

        const { data: games, error: dbError } = await supabase
            .from('games')
            .select('id, status, home_team_id, away_team_id')
            .in('status', ['scheduled', 'in_progress'])
            .limit(5)

        if (dbError) {
            results.push(`DB Error: ${dbError.message}`)
        } else {
            results.push(`Found ${games?.length || 0} active games`)
        }

        // Test RapidAPI connection
        results.push('')
        results.push('=== RapidAPI Test ===')

        if (!RAPIDAPI_KEY) {
            results.push('ERROR: RAPIDAPI_KEY is not set!')
        } else {
            const today = new Date()
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
            results.push(`Fetching scoreboard for ${dateStr}...`)

            const url = `${RAPIDAPI_BASE_URL}/nfl-scoreboard-day?day=${dateStr}`

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST,
                },
            })

            results.push(`Response status: ${response.status}`)

            if (response.ok) {
                const data = await response.json()
                results.push(`API returned ${data.events?.length || 0} games`)

                if (data.events && data.events.length > 0) {
                    const event = data.events[0]
                    const comp = event.competitions[0]
                    const home = comp.competitors.find((c: any) => c.homeAway === 'home')
                    const away = comp.competitors.find((c: any) => c.homeAway === 'away')
                    results.push(`First game: ${away?.team?.abbreviation} @ ${home?.team?.abbreviation}`)
                    results.push(`Score: ${away?.score} - ${home?.score}`)
                    results.push(`Status: ${event.status?.type?.description}`)
                }
            } else {
                const text = await response.text()
                results.push(`API Error: ${text.substring(0, 200)}`)
            }
        }

    } catch (error) {
        results.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return new NextResponse(results.join('\n'), {
        headers: { 'Content-Type': 'text/plain' },
    })
}
