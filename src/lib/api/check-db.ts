/**
 * Check database for games and teams
 * Run with: npx tsx src/lib/api/check-db.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkDatabase() {
    console.log('🔍 Checking database...\n')

    // Check teams
    const { data: teams, count: teamCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })

    console.log(`✅ Teams: ${teamCount} total`)
    if (teams && teams.length > 0) {
        console.log(`   Sample: ${teams.slice(0, 3).map(t => `${t.name} (${t.abbreviation})`).join(', ')}...\n`)
    }

    // Check games
    const { data: games, count: gameCount } = await supabase
        .from('games')
        .select(`
      *,
      home_team:teams!home_team_id(name, abbreviation),
      away_team:teams!away_team_id(name, abbreviation),
      playoff_round:playoff_rounds(name)
    `, { count: 'exact' })
        .eq('season', CURRENT_SEASON)

    console.log(`✅ Games for season ${CURRENT_SEASON}: ${gameCount} total`)

    if (games && games.length > 0) {
        console.log('\nGames:')
        games.forEach((game: any) => {
            console.log(`  - ${game.away_team?.abbreviation} @ ${game.home_team?.abbreviation} (${game.playoff_round?.name}) - Week ${game.week_number}`)
            console.log(`    Status: ${game.status}, Locked: ${game.is_locked}`)
            console.log(`    Scheduled: ${new Date(game.scheduled_start_time).toLocaleString()}`)
        })
    } else {
        console.log('   ⚠️  No games found! Run: npx tsx src/lib/api/seed-test-games.ts')
    }

    // Check playoff rounds
    const { data: rounds } = await supabase
        .from('playoff_rounds')
        .select('*')
        .order('round_order')

    console.log(`\n✅ Playoff Rounds:`)
    rounds?.forEach(r => {
        console.log(`   ${r.name}: ${r.points_per_correct_pick} points`)
    })
}

checkDatabase()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
