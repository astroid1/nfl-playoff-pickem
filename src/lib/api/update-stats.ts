/**
 * Update stats and leaderboard
 * Run with: npx tsx src/lib/api/update-stats.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const CURRENT_SEASON = parseInt(process.env.CURRENT_NFL_SEASON || '2025')

async function updateStats() {
    // Recalculate points for completed games
    console.log('Calculating points for completed games...')
    const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')
    if (calcError) {
        console.error('Error calculating points:', calcError)
    } else {
        console.log('✅ Points calculated')
    }

    // Refresh user stats for current season
    console.log('Refreshing user stats...')
    const { error: statsError } = await supabase.rpc('refresh_user_stats', { p_season: CURRENT_SEASON })
    if (statsError) {
        console.error('Error refreshing stats:', statsError)
    } else {
        console.log('✅ Stats refreshed')
    }

    // Show current leaderboard from user_stats
    console.log('\n📊 Current Leaderboard:')
    const { data: leaderboard, error: lbError } = await supabase
        .from('user_stats')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(10)

    if (lbError) {
        console.error('Error fetching leaderboard:', lbError)
    } else if (leaderboard && leaderboard.length > 0) {
        // Fetch user names from profiles table
        const userIds = leaderboard.map(e => e.user_id)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .in('id', userIds)

        const userMap = new Map(profiles?.map(p => [p.id, p.display_name || p.username]) || [])

        leaderboard.forEach((entry, i) => {
            const name = userMap.get(entry.user_id) || 'Unknown'
            const totalPicks = entry.total_correct_picks + entry.total_incorrect_picks
            console.log(`  ${i + 1}. ${name}: ${entry.total_points} pts (${entry.total_correct_picks}/${totalPicks} correct)`)
        })
    } else {
        console.log('  No stats found yet')
    }

    // Show picks for the Bears/Packers game
    console.log('\n🏈 Bears vs Packers picks:')
    const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('id, points_earned, is_correct, user_id, selected_team_id')
        .eq('game_id', 35)

    if (picksError) {
        console.error('Error fetching picks:', picksError)
    } else if (picks && picks.length > 0) {
        // Fetch profiles and teams
        const userIds = picks.map(p => p.user_id)
        const teamIds = picks.map(p => p.selected_team_id)

        const { data: profiles } = await supabase.from('profiles').select('id, username, display_name').in('id', userIds)
        const { data: teams } = await supabase.from('teams').select('id, abbreviation').in('id', teamIds)

        const userMap = new Map(profiles?.map(p => [p.id, p.display_name || p.username]) || [])
        const teamMap = new Map(teams?.map(t => [t.id, t.abbreviation]) || [])

        picks.forEach((pick) => {
            const name = userMap.get(pick.user_id) || 'Unknown'
            const team = teamMap.get(pick.selected_team_id) || '?'
            const result = pick.is_correct ? '✅' : '❌'
            console.log(`  ${result} ${name} picked ${team} (+${pick.points_earned || 0} pts)`)
        })
    } else {
        console.log('  No picks found for this game')
    }
}

updateStats()
    .then(() => {
        console.log('\n🎉 Stats update completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Update failed:', error)
        process.exit(1)
    })
