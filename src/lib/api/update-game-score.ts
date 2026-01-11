/**
 * Manual score update script
 * Run with: npx tsx src/lib/api/update-game-score.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function updateGameScore() {
    // Find the Bears vs Packers game
    // Bears (CHI) beat Packers (GB) 31-27

    // First, find the team IDs
    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, abbreviation, name')
        .in('abbreviation', ['CHI', 'GB'])

    if (teamsError || !teams) {
        console.error('Error fetching teams:', teamsError)
        return
    }

    console.log('Found teams:', teams)

    const bearsTeam = teams.find(t => t.abbreviation === 'CHI')
    const packersTeam = teams.find(t => t.abbreviation === 'GB')

    if (!bearsTeam || !packersTeam) {
        console.error('Could not find Bears or Packers team')
        return
    }

    console.log(`Bears ID: ${bearsTeam.id}, Packers ID: ${packersTeam.id}`)

    // Find the game between these teams
    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .or(`and(home_team_id.eq.${bearsTeam.id},away_team_id.eq.${packersTeam.id}),and(home_team_id.eq.${packersTeam.id},away_team_id.eq.${bearsTeam.id})`)
        .order('scheduled_start_time', { ascending: false })
        .limit(1)

    if (gamesError || !games || games.length === 0) {
        console.error('Error finding game:', gamesError)
        console.log('No Bears vs Packers game found')
        return
    }

    const game = games[0]
    console.log('Found game:', game)

    // Determine which team is home/away and set scores
    // Bears won 31-27
    const bearsScore = 31
    const packersScore = 27

    let homeScore: number
    let awayScore: number
    let winningTeamId: string

    if (game.home_team_id === bearsTeam.id) {
        // Bears are home
        homeScore = bearsScore
        awayScore = packersScore
        winningTeamId = bearsTeam.id
    } else {
        // Packers are home
        homeScore = packersScore
        awayScore = bearsScore
        winningTeamId = bearsTeam.id // Bears still won
    }

    // Update the game
    const { error: updateError } = await supabase
        .from('games')
        .update({
            home_team_score: homeScore,
            away_team_score: awayScore,
            winning_team_id: winningTeamId,
            status: 'final',
            is_locked: true,
            last_updated_at: new Date().toISOString(),
        })
        .eq('id', game.id)

    if (updateError) {
        console.error('Error updating game:', updateError)
        return
    }

    console.log(`✅ Updated game: Bears ${bearsScore} - Packers ${packersScore}`)
    console.log(`   Winner: Chicago Bears`)

    // Trigger points calculation
    const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games')
    if (calcError) {
        console.error('Error calculating points:', calcError)
    } else {
        console.log('✅ Points calculated')
    }
}

updateGameScore()
    .then(() => {
        console.log('\n🎉 Score update completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Update failed:', error)
        process.exit(1)
    })
