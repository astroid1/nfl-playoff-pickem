/**
 * Playoff Simulation Script
 *
 * This script simulates a complete playoff run by:
 * 1. Creating test games for all playoff rounds (Wild Card through Super Bowl)
 * 2. Creating test user picks for multiple users
 * 3. Simulating game results progressively
 * 4. Testing the scoring system and leaderboard updates
 *
 * Run with: npx tsx src/lib/api/simulate-playoffs.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CURRENT_SEASON = 2025

// Test teams for simulation
const AFC_TEAMS = [
  { id: 'afc1', name: 'Kansas City Chiefs', abbreviation: 'KC' },
  { id: 'afc2', name: 'Buffalo Bills', abbreviation: 'BUF' },
  { id: 'afc3', name: 'Baltimore Ravens', abbreviation: 'BAL' },
  { id: 'afc4', name: 'Houston Texans', abbreviation: 'HOU' },
  { id: 'afc5', name: 'Pittsburgh Steelers', abbreviation: 'PIT' },
  { id: 'afc6', name: 'Los Angeles Chargers', abbreviation: 'LAC' },
]

const NFC_TEAMS = [
  { id: 'nfc1', name: 'Detroit Lions', abbreviation: 'DET' },
  { id: 'nfc2', name: 'Philadelphia Eagles', abbreviation: 'PHI' },
  { id: 'nfc3', name: 'Tampa Bay Buccaneers', abbreviation: 'TB' },
  { id: 'nfc4', name: 'Los Angeles Rams', abbreviation: 'LAR' },
  { id: 'nfc5', name: 'Minnesota Vikings', abbreviation: 'MIN' },
  { id: 'nfc6', name: 'Washington Commanders', abbreviation: 'WAS' },
]

// Simulate Wild Card games
const WILD_CARD_GAMES = [
  { home: AFC_TEAMS[3], away: AFC_TEAMS[5], winner: 'home' }, // HOU vs LAC -> HOU
  { home: AFC_TEAMS[2], away: AFC_TEAMS[4], winner: 'home' }, // BAL vs PIT -> BAL
  { home: NFC_TEAMS[3], away: NFC_TEAMS[4], winner: 'away' }, // LAR vs MIN -> MIN
  { home: NFC_TEAMS[2], away: NFC_TEAMS[5], winner: 'home' }, // TB vs WAS -> TB
]

// Simulate Divisional games (based on Wild Card results)
const DIVISIONAL_GAMES = [
  { home: AFC_TEAMS[0], away: AFC_TEAMS[3], winner: 'home' }, // KC vs HOU -> KC
  { home: AFC_TEAMS[1], away: AFC_TEAMS[2], winner: 'away' }, // BUF vs BAL -> BAL
  { home: NFC_TEAMS[0], away: NFC_TEAMS[4], winner: 'home' }, // DET vs MIN -> DET
  { home: NFC_TEAMS[1], away: NFC_TEAMS[2], winner: 'home' }, // PHI vs TB -> PHI
]

// Simulate Conference Championships  (using "Conference" to match database)
const CHAMPIONSHIP_GAMES = [
  { home: AFC_TEAMS[0], away: AFC_TEAMS[2], winner: 'home' }, // KC vs BAL -> KC
  { home: NFC_TEAMS[0], away: NFC_TEAMS[1], winner: 'away' }, // DET vs PHI -> PHI
]

// Simulate Super Bowl
const SUPER_BOWL = [
  { home: AFC_TEAMS[0], away: NFC_TEAMS[1], winner: 'away' }, // KC vs PHI -> PHI
]

async function createTestTeams() {
  console.log('Creating test teams...')

  const allTeams = [...AFC_TEAMS, ...NFC_TEAMS]

  for (const team of allTeams) {
    const parts = team.name.split(' ')
    const teamName = parts.pop() ||team.name
    const city = parts.join(' ')

    const { error } = await supabase
      .from('teams')
      .upsert({
        api_team_id: team.id,
        city: city,
        name: teamName,
        abbreviation: team.abbreviation,
        conference: team.id.startsWith('afc') ? 'AFC' : 'NFC',
        logo_url: `https://via.placeholder.com/150?text=${team.abbreviation}`,
      }, { onConflict: 'api_team_id' })

    if (error) console.error(`Error creating team ${team.name}:`, error)
  }

  console.log('✓ Teams created')
}

async function createTestGames() {
  console.log('Creating test games...')

  // Get team IDs from database
  const { data: teams } = await supabase.from('teams').select('*')
  const teamMap = new Map(teams?.map(t => [t.api_team_id, t]))

  // Get playoff round IDs
  const { data: rounds } = await supabase.from('playoff_rounds').select('*')
  const roundMap = new Map(rounds?.map(r => [r.name, r.id]))

  const games = []
  let gameDate = new Date('2026-01-11T13:00:00Z') // Start date for Wild Card

  // Wild Card games (week 1)
  for (const game of WILD_CARD_GAMES) {
    games.push({
      api_game_id: `sim-wc-${games.length}`,
      season: CURRENT_SEASON,
      week_number: 1,
      playoff_round_id: roundMap.get('Wild Card'),
      home_team_id: teamMap.get(game.home.id)?.id,
      away_team_id: teamMap.get(game.away.id)?.id,
      scheduled_start_time: gameDate.toISOString(),
      status: 'scheduled',
    })
    gameDate = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000) // Add 3 hours
  }

  // Divisional games (week 2)
  gameDate = new Date('2026-01-18T13:00:00Z')
  for (const game of DIVISIONAL_GAMES) {
    games.push({
      api_game_id: `sim-div-${games.length}`,
      season: CURRENT_SEASON,
      week_number: 2,
      playoff_round_id: roundMap.get('Divisional'),
      home_team_id: teamMap.get(game.home.id)?.id,
      away_team_id: teamMap.get(game.away.id)?.id,
      scheduled_start_time: gameDate.toISOString(),
      status: 'scheduled',
    })
    gameDate = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000)
  }

  // Championship games (week 3)
  gameDate = new Date('2026-01-26T15:00:00Z')
  for (const game of CHAMPIONSHIP_GAMES) {
    games.push({
      api_game_id: `sim-conf-${games.length}`,
      season: CURRENT_SEASON,
      week_number: 3,
      playoff_round_id: roundMap.get('Conference'),
      home_team_id: teamMap.get(game.home.id)?.id,
      away_team_id: teamMap.get(game.away.id)?.id,
      scheduled_start_time: gameDate.toISOString(),
      status: 'scheduled',
    })
    gameDate = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000)
  }

  // Super Bowl (week 4)
  gameDate = new Date('2026-02-09T18:30:00Z')
  for (const game of SUPER_BOWL) {
    games.push({
      api_game_id: `sim-sb-${games.length}`,
      season: CURRENT_SEASON,
      week_number: 4,
      playoff_round_id: roundMap.get('Super Bowl'),
      home_team_id: teamMap.get(game.home.id)?.id,
      away_team_id: teamMap.get(game.away.id)?.id,
      scheduled_start_time: gameDate.toISOString(),
      status: 'scheduled',
    })
  }

  // Insert games
  const { error } = await supabase
    .from('games')
    .upsert(games, { onConflict: 'api_game_id' })

  if (error) {
    console.error('Error creating games:', error)
  } else {
    console.log(`✓ Created ${games.length} games`)
  }
}

async function createTestPicks() {
  console.log('Creating test picks for all users...')

  // Get all users
  const { data: profiles } = await supabase.from('profiles').select('*')
  if (!profiles || profiles.length === 0) {
    console.log('No users found. Create some users first!')
    return
  }

  // Get all games
  const { data: games } = await supabase
    .from('games')
    .select('*, home_team:teams!games_home_team_id_fkey(*), away_team:teams!games_away_team_id_fkey(*), playoff_round:playoff_rounds(*)')
    .eq('season', CURRENT_SEASON)
    .order('scheduled_start_time', { ascending: true })

  if (!games || games.length === 0) {
    console.log('No games found!')
    return
  }

  // Create picks for each user
  for (const profile of profiles) {
    console.log(`Creating picks for ${profile.username}...`)

    const picks = []

    for (const game of games) {
      // Randomly pick home or away team (70% home team advantage for variety)
      const pickHome = Math.random() > 0.3
      const selectedTeamId = pickHome ? game.home_team_id : game.away_team_id

      picks.push({
        user_id: profile.id,
        game_id: game.id,
        selected_team_id: selectedTeamId,
        season: CURRENT_SEASON,
        week_number: game.week_number,
      })
    }

    const { error } = await supabase
      .from('picks')
      .upsert(picks, { onConflict: 'user_id,game_id' })

    if (error) {
      console.error(`Error creating picks for ${profile.username}:`, error)
    }
  }

  console.log('✓ Picks created for all users')
}

async function simulateGames(round: string, gamesData: any[]) {
  console.log(`\nSimulating ${round} games...`)

  // Get playoff round ID
  const { data: rounds } = await supabase
    .from('playoff_rounds')
    .select('*')
    .eq('name', round)
    .single()

  if (!rounds) {
    console.log(`Round ${round} not found`)
    return
  }

  // Get games for this round
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('season', CURRENT_SEASON)
    .eq('playoff_round_id', rounds.id)

  if (!games || games.length === 0) {
    console.log(`No games found for ${round}`)
    return
  }

  // Update each game with results
  for (let i = 0; i < games.length && i < gamesData.length; i++) {
    const game = games[i]
    const gameData = gamesData[i]

    const winnerTeamId = gameData.winner === 'home'
      ? game.home_team_id
      : game.away_team_id

    const homeScore = gameData.winner === 'home' ? 27 : 20
    const awayScore = gameData.winner === 'home' ? 20 : 27

    const { error } = await supabase
      .from('games')
      .update({
        status: 'final',
        is_locked: true,
        locked_at: new Date().toISOString(),
        home_team_score: homeScore,
        away_team_score: awayScore,
        winning_team_id: winnerTeamId,
      })
      .eq('id', game.id)

    if (error) {
      console.error(`Error updating game ${game.id}:`, error)
    } else {
      console.log(`✓ Game ${i + 1} completed`)
    }
  }

  console.log(`✓ ${round} games completed`)
}

async function runSimulation() {
  console.log('🏈 Starting Playoff Simulation\n')

  try {
    // Step 1: Create teams and games
    await createTestTeams()
    await createTestGames()

    // Step 2: Create picks for all users
    await createTestPicks()

    console.log('\n📊 Simulation Setup Complete!')
    console.log('\nNow you can progressively simulate games:')
    console.log('- Wild Card: simulateGames("Wild Card", WILD_CARD_GAMES)')
    console.log('- Divisional: simulateGames("Divisional", DIVISIONAL_GAMES)')
    console.log('- Championship: simulateGames("Championship", CHAMPIONSHIP_GAMES)')
    console.log('- Super Bowl: simulateGames("Super Bowl", SUPER_BOWL)')
    console.log('\nOr run all at once with runAllGames()')

  } catch (error) {
    console.error('Simulation error:', error)
  }
}

async function runAllGames() {
  console.log('\n🎮 Simulating all playoff games...\n')

  await simulateGames('Wild Card', WILD_CARD_GAMES)
  await new Promise(resolve => setTimeout(resolve, 1000))

  await simulateGames('Divisional', DIVISIONAL_GAMES)
  await new Promise(resolve => setTimeout(resolve, 1000))

  await simulateGames('Championship', CHAMPIONSHIP_GAMES)
  await new Promise(resolve => setTimeout(resolve, 1000))

  await simulateGames('Super Bowl', SUPER_BOWL)

  console.log('\n🏆 All games simulated! Check the leaderboard!')
}

// Export functions for manual control
export { runSimulation, simulateGames, runAllGames, WILD_CARD_GAMES, DIVISIONAL_GAMES, CHAMPIONSHIP_GAMES, SUPER_BOWL }

// Run if called directly
if (require.main === module) {
  runSimulation()
}
