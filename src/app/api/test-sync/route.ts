/**
 * Test endpoint to verify sync-scores functionality
 * Call this directly to test if the API and database are working
 * This now does a FULL sync test, including database updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

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
    results.push(`SUPABASE_URL set: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    results.push(`SUPABASE_KEY set: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)
    results.push(`SERVICE_ROLE_KEY set: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)

    try {
        // Test Supabase connection with service client
        results.push('')
        results.push('=== Supabase Service Client Test ===')
        const supabase = createServiceClient()

        const { data: games, error: dbError } = await supabase
            .from('games')
            .select(`
                id,
                api_game_id,
                home_team_id,
                away_team_id,
                status,
                home_team_score,
                away_team_score,
                scheduled_start_time,
                home_team:teams!home_team_id(abbreviation),
                away_team:teams!away_team_id(abbreviation)
            `)
            .in('status', ['scheduled', 'in_progress'])

        if (dbError) {
            results.push(`DB Error: ${dbError.message}`)
            results.push(`DB Error Code: ${dbError.code}`)
            results.push(`DB Error Details: ${JSON.stringify(dbError.details)}`)
        } else {
            results.push(`Found ${games?.length || 0} active games`)
            if (games && games.length > 0) {
                for (const game of games) {
                    const homeAbbr = (game.home_team as any)?.abbreviation
                    const awayAbbr = (game.away_team as any)?.abbreviation
                    results.push(`  - ${awayAbbr}@${homeAbbr}: ${game.status} (${game.away_team_score}-${game.home_team_score})`)
                }
            }
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
                    for (const event of data.events) {
                        const comp = event.competitions[0]
                        const home = comp.competitors.find((c: any) => c.homeAway === 'home')
                        const away = comp.competitors.find((c: any) => c.homeAway === 'away')
                        results.push(`  - ${away?.team?.abbreviation}@${home?.team?.abbreviation}: ${event.status?.type?.description} (${away?.score}-${home?.score})`)
                    }

                    // Now try to do a test update
                    results.push('')
                    results.push('=== Test Database Update ===')

                    if (games && games.length > 0) {
                        const dbGame = games[0]
                        const homeAbbr = (dbGame.home_team as any)?.abbreviation
                        const awayAbbr = (dbGame.away_team as any)?.abbreviation

                        // Find matching API game
                        const apiGame = data.events.find((e: any) => {
                            const comp = e.competitions[0]
                            const apiHome = comp.competitors.find((c: any) => c.homeAway === 'home')
                            const apiAway = comp.competitors.find((c: any) => c.homeAway === 'away')
                            return apiHome?.team?.abbreviation === homeAbbr && apiAway?.team?.abbreviation === awayAbbr
                        })

                        if (apiGame) {
                            const comp = apiGame.competitions[0]
                            const apiHome = comp.competitors.find((c: any) => c.homeAway === 'home')
                            const apiAway = comp.competitors.find((c: any) => c.homeAway === 'away')

                            // Map RapidAPI status state to our status
                            let newStatus: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled' = 'scheduled'
                            const state = apiGame.status?.type?.state
                            if (state === 'in') {
                                newStatus = 'in_progress'
                            } else if (state === 'post') {
                                newStatus = 'final'
                            } else if (state === 'pre') {
                                newStatus = 'scheduled'
                            }
                            const homeScore = parseInt(apiHome?.score) || null
                            const awayScore = parseInt(apiAway?.score) || null
                            const quarter = apiGame.status?.period || null
                            const gameClock = apiGame.status?.displayClock || null

                            results.push(`Updating ${awayAbbr}@${homeAbbr}...`)
                            results.push(`  API state: ${state}`)
                            results.push(`  New status: ${newStatus}`)
                            results.push(`  New scores: ${awayScore}-${homeScore}`)
                            results.push(`  Quarter: ${quarter}, Clock: ${gameClock}`)

                            const { error: updateError } = await supabase
                                .from('games')
                                .update({
                                    status: newStatus,
                                    home_team_score: homeScore,
                                    away_team_score: awayScore,
                                    quarter: quarter,
                                    game_clock: gameClock,
                                    last_updated_at: new Date().toISOString(),
                                })
                                .eq('id', dbGame.id)

                            if (updateError) {
                                results.push(`UPDATE ERROR: ${updateError.message}`)
                                results.push(`UPDATE ERROR Code: ${updateError.code}`)
                                results.push(`UPDATE ERROR Details: ${JSON.stringify(updateError.details)}`)
                            } else {
                                results.push(`SUCCESS: Updated game ${dbGame.id}`)

                                // Verify the update
                                const { data: verifyData, error: verifyError } = await supabase
                                    .from('games')
                                    .select('home_team_score, away_team_score, last_updated_at')
                                    .eq('id', dbGame.id)
                                    .single()

                                if (verifyError) {
                                    results.push(`VERIFY ERROR: ${verifyError.message}`)
                                } else {
                                    results.push(`VERIFIED: Score (${verifyData?.away_team_score}-${verifyData?.home_team_score}), Updated: ${verifyData?.last_updated_at}`)
                                }
                            }
                        } else {
                            results.push(`No matching API game found for ${awayAbbr}@${homeAbbr}`)
                        }
                    }
                }
            } else {
                const text = await response.text()
                results.push(`API Error: ${text.substring(0, 200)}`)
            }
        }

    } catch (error) {
        results.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.push(`Stack: ${error instanceof Error ? error.stack : 'No stack'}`)
    }

    return new NextResponse(results.join('\n'), {
        headers: { 'Content-Type': 'text/plain' },
    })
}
