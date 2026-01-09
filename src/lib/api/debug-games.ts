/**
 * Debug script to check what's happening with game queries
 * Run with: npx tsx src/lib/api/debug-games.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON = parseInt(process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON || '2025')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function debugGames() {
    console.log('🔍 Debugging game queries...\n')
    console.log(`Current Season from env: ${CURRENT_SEASON}`)
    console.log(`NEXT_PUBLIC_CURRENT_NFL_SEASON: ${process.env.NEXT_PUBLIC_CURRENT_NFL_SEASON}\n`)

    // Check all games
    const { data: allGames, error: allError } = await supabase
        .from('games')
        .select('*')

    console.log(`Total games in database: ${allGames?.length || 0}`)
    if (allError) console.error('Error fetching all games:', allError)

    // Check games by season
    const { data: seasonGames, error: seasonError } = await supabase
        .from('games')
        .select('*')
        .eq('season', CURRENT_SEASON)

    console.log(`Games for season ${CURRENT_SEASON}: ${seasonGames?.length || 0}`)
    if (seasonError) console.error('Error fetching season games:', seasonError)

    // Check games by week
    for (let week = 1; week <= 4; week++) {
        const { data: weekGames } = await supabase
            .from('games')
            .select('*')
            .eq('season', CURRENT_SEASON)
            .eq('week_number', week)

        console.log(`  Week ${week}: ${weekGames?.length || 0} games`)
    }

    // Show sample game data
    if (seasonGames && seasonGames.length > 0) {
        console.log('\nSample game data:')
        console.log(JSON.stringify(seasonGames[0], null, 2))
    }
}

debugGames()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
