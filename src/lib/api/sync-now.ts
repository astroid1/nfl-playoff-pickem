import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAPIDAPI_BASE_URL = process.env.RAPIDAPI_NFL_BASE_URL || 'https://nfl-api-data.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'nfl-api-data.p.rapidapi.com'

async function syncScores() {
    console.log('Starting manual score sync...\n')

    // Get active games from DB with team info
    const { data: activeGames, error: fetchError } = await supabase
        .from('games')
        .select(`
            id,
            api_game_id,
            home_team_id,
            away_team_id,
            status,
            scheduled_start_time,
            home_team:teams!home_team_id(abbreviation),
            away_team:teams!away_team_id(abbreviation)
        `)
        .in('status', ['scheduled', 'in_progress'])

    if (fetchError) {
        console.error('Error fetching games:', fetchError)
        return
    }

    const gameCount = activeGames ? activeGames.length : 0
    console.log('Found ' + gameCount + ' active games in DB')

    if (!activeGames || activeGames.length === 0) {
        console.log('No active games to sync')
        return
    }

    // Get today's date in YYYYMMDD format
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    console.log('Fetching scoreboard for ' + dateStr + '...')

    const url = RAPIDAPI_BASE_URL + '/nfl-scoreboard-day?day=' + dateStr
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY!,
            'x-rapidapi-host': RAPIDAPI_HOST,
        },
    })

    if (!response.ok) {
        console.error('API Error:', response.status, response.statusText)
        return
    }

    const data = await response.json()
    const apiCount = data.events ? data.events.length : 0
    console.log('API returned ' + apiCount + ' games\n')

    let updated = 0

    for (const dbGame of activeGames) {
        const homeAbbr = (dbGame.home_team as any).abbreviation
        const awayAbbr = (dbGame.away_team as any).abbreviation

        console.log('Looking for ' + awayAbbr + ' @ ' + homeAbbr + '...')

        // Find matching API game
        const apiGame = data.events && data.events.find((e: any) => {
            const comp = e.competitions[0]
            const home = comp.competitors.find((c: any) => c.homeAway === 'home')
            const away = comp.competitors.find((c: any) => c.homeAway === 'away')
            return home && away && home.team.abbreviation === homeAbbr && away.team.abbreviation === awayAbbr
        })

        if (!apiGame) {
            console.log('  -> Not found in todays games')
            continue
        }

        const comp = apiGame.competitions[0]
        const home = comp.competitors.find((c: any) => c.homeAway === 'home')
        const away = comp.competitors.find((c: any) => c.homeAway === 'away')

        // Determine status
        let newStatus = 'scheduled'
        if (apiGame.status.type.state === 'in') {
            newStatus = 'in_progress'
        } else if (apiGame.status.type.state === 'post') {
            newStatus = 'final'
        }

        const homeScore = parseInt(home.score) || 0
        const awayScore = parseInt(away.score) || 0
        const quarter = apiGame.status.period || null
        const gameClock = apiGame.status.displayClock || null

        // Determine winning team if final
        let winningTeamId = null
        if (newStatus === 'final') {
            if (homeScore > awayScore) {
                winningTeamId = dbGame.home_team_id
            } else if (awayScore > homeScore) {
                winningTeamId = dbGame.away_team_id
            }
        }

        console.log('  -> Found! Status: ' + newStatus + ', Score: ' + awayScore + '-' + homeScore + ', Q' + quarter + ' ' + (gameClock || ''))

        // Update DB
        const updateData: any = {
            status: newStatus,
            home_team_score: homeScore,
            away_team_score: awayScore,
            quarter: quarter,
            game_clock: gameClock,
            winning_team_id: winningTeamId,
            api_game_id: apiGame.id,
            last_updated_at: new Date().toISOString(),
        }

        if (dbGame.status === 'scheduled' && newStatus === 'in_progress') {
            updateData.actual_start_time = new Date().toISOString()
        }

        const { error: updateError } = await supabase
            .from('games')
            .update(updateData)
            .eq('id', dbGame.id)

        if (updateError) {
            console.error('  -> Error updating: ' + updateError.message)
        } else {
            console.log('  -> Updated successfully!')
            updated++
        }
    }

    console.log('\nSynced ' + updated + ' games')

    // Trigger points calculation
    const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')
    if (calcError) {
        console.log('Points calc error:', calcError.message)
    } else {
        console.log('Points calculated')
    }
}

syncScores().then(() => process.exit(0)).catch(e => {
    console.error(e)
    process.exit(1)
})
