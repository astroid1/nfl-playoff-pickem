/**
 * Manual score update script
 * Use when APIs are down/overloaded
 *
 * Usage: npx tsx src/lib/api/manual-score-update.ts <home_score> <away_score> [quarter] [clock]
 * Example: npx tsx src/lib/api/manual-score-update.ts 14 21 2 "5:30"
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const currentSeason = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function manualUpdate() {
    const args = process.argv.slice(2)

    if (args.length < 2) {
        console.log('Usage: npx tsx src/lib/api/manual-score-update.ts <home_score> <away_score> [quarter] [clock] [status]')
        console.log('Example: npx tsx src/lib/api/manual-score-update.ts 14 21 2 "5:30"')
        console.log('Status options: in_progress, final')
        return
    }

    const homeScore = parseInt(args[0])
    const awayScore = parseInt(args[1])
    const quarter = args[2] ? parseInt(args[2]) : null
    const gameClock = args[3] || null
    const status = args[4] || 'in_progress'

    // Get the Super Bowl game (week 4)
    const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('id, api_game_id, home_team_id, away_team_id, home_team:teams!home_team_id(abbreviation), away_team:teams!away_team_id(abbreviation)')
        .eq('season', currentSeason)
        .eq('week_number', 4)
        .single()

    if (fetchError || !game) {
        console.error('Error fetching Super Bowl game:', fetchError?.message)
        return
    }

    const homeAbbr = (game.home_team as any)?.abbreviation
    const awayAbbr = (game.away_team as any)?.abbreviation

    console.log(`Updating ${awayAbbr} @ ${homeAbbr}`)
    console.log(`Score: ${awayAbbr} ${awayScore} - ${homeAbbr} ${homeScore}`)
    console.log(`Quarter: ${quarter || 'N/A'}, Clock: ${gameClock || 'N/A'}`)
    console.log(`Status: ${status}`)

    // Determine winning team if final
    let winningTeamId = null
    if (status === 'final') {
        if (homeScore > awayScore) {
            winningTeamId = game.home_team_id
        } else if (awayScore > homeScore) {
            winningTeamId = game.away_team_id
        }
    }

    const updateData: any = {
        home_team_score: homeScore,
        away_team_score: awayScore,
        status: status,
        quarter: quarter,
        game_clock: gameClock,
        last_updated_at: new Date().toISOString(),
    }

    if (winningTeamId) {
        updateData.winning_team_id = winningTeamId
    }

    const { error: updateError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', game.id)

    if (updateError) {
        console.error('Error updating game:', updateError.message)
        return
    }

    console.log('\n✅ Game updated successfully!')

    // If game is final, calculate points
    if (status === 'final') {
        console.log('Calculating points...')
        const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')
        if (calcError) {
            console.error('Error calculating points:', calcError.message)
        } else {
            console.log('✅ Points calculated')
        }

        // Calculate tiebreaker
        console.log('Calculating tiebreakers...')
        const { error: tbError } = await supabase.rpc('calculate_superbowl_tiebreaker', { p_season: currentSeason })
        if (tbError) {
            console.error('Error calculating tiebreakers:', tbError.message)
        } else {
            console.log('✅ Tiebreakers calculated')
        }

        // Refresh user stats
        console.log('Refreshing stats...')
        const { error: statsError } = await supabase.rpc('refresh_user_stats', { p_season: currentSeason })
        if (statsError) {
            console.error('Error refreshing stats:', statsError.message)
        } else {
            console.log('✅ Stats refreshed')
        }
    }
}

manualUpdate()
