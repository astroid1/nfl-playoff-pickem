/**
 * One-time script to create missing picks for locked games
 * This handles the case where auto-pick failed because is_auto_pick column didn't exist
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingPicks() {
    console.log('Creating missing picks for locked games...\n')

    // Get all users
    const { data: users } = await supabase.from('profiles').select('id, username')
    const allUserIds = users?.map(u => u.id) || []
    const userMap = new Map(users?.map(u => [u.id, u.username]) || [])

    // Get locked games
    const { data: lockedGames } = await supabase
        .from('games')
        .select('id, api_game_id, home_team_id, away_team_id, season, week_number')
        .eq('is_locked', true)

    let totalCreated = 0

    for (const game of (lockedGames || [])) {
        // Get existing picks
        const { data: existingPicks } = await supabase
            .from('picks')
            .select('user_id')
            .eq('game_id', game.id)

        const usersWithPicks = new Set(existingPicks?.map(p => p.user_id) || [])
        const usersWithoutPicks = allUserIds.filter(id => !usersWithPicks.has(id))

        if (usersWithoutPicks.length === 0) continue

        console.log(`Game ${game.api_game_id}: Missing ${usersWithoutPicks.length} picks`)
        usersWithoutPicks.forEach(id => console.log(`  - ${userMap.get(id)}`))

        // Create picks WITHOUT is_auto_pick column (in case it doesn't exist)
        for (const userId of usersWithoutPicks) {
            const selectedTeamId = Math.random() < 0.5 ? game.home_team_id : game.away_team_id

            // Try with is_auto_pick first
            let { error } = await supabase
                .from('picks')
                .insert({
                    user_id: userId,
                    game_id: game.id,
                    selected_team_id: selectedTeamId,
                    season: game.season,
                    week_number: game.week_number,
                    is_auto_pick: true,
                })

            // If that fails due to column not existing, try without it
            if (error && error.message.includes('is_auto_pick')) {
                console.log('  (is_auto_pick column not found, inserting without it)')
                const result = await supabase
                    .from('picks')
                    .insert({
                        user_id: userId,
                        game_id: game.id,
                        selected_team_id: selectedTeamId,
                        season: game.season,
                        week_number: game.week_number,
                    })
                error = result.error
            }

            if (error) {
                console.error(`  Error creating pick for ${userMap.get(userId)}:`, error.message)
            } else {
                console.log(`  ✅ Created pick for ${userMap.get(userId)}`)
                totalCreated++
            }
        }
    }

    console.log(`\nTotal picks created: ${totalCreated}`)
}

createMissingPicks()
