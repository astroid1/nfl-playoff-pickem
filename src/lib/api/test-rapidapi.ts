/**
 * Test script for RapidAPI NFL client
 *
 * Run with: npx tsx src/lib/api/test-rapidapi.ts
 *
 * Make sure RAPIDAPI_KEY is set in your .env.local file
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { RapidApiNFLClient } from './rapidapi-nfl-client'
import { RAPIDAPI_SEASON_TYPES } from '@/lib/types/rapidapi-nfl-types'

async function testRapidApi() {
    console.log('='.repeat(60))
    console.log('Testing RapidAPI NFL Client')
    console.log('='.repeat(60))

    const apiKey = process.env.RAPIDAPI_KEY
    if (!apiKey) {
        console.error('Error: RAPIDAPI_KEY environment variable is not set')
        console.log('Please add RAPIDAPI_KEY to your .env.local file')
        process.exit(1)
    }

    console.log('API Key found:', apiKey.substring(0, 8) + '...')

    const client = new RapidApiNFLClient(apiKey)

    try {
        // Test 1: Fetch Teams
        console.log('\n--- Test 1: Fetch Teams ---')
        const teams = await client.fetchTeams()
        console.log(`Found ${teams.length} teams`)
        if (teams.length > 0) {
            const sampleTeam = teams[0]
            console.log('Sample team:', {
                id: sampleTeam.id,
                name: sampleTeam.name,
                code: sampleTeam.code,
                city: sampleTeam.city,
                conference: sampleTeam.conference?.name,
                division: sampleTeam.division?.name,
            })
        }

        // Test 2: Fetch Regular Season Games (Week 1)
        console.log('\n--- Test 2: Fetch Regular Season Games (Week 1) ---')
        const currentSeason = 2024
        const regularGames = await client.fetchGamesByWeek(currentSeason, 1, RAPIDAPI_SEASON_TYPES.REGULAR)
        console.log(`Found ${regularGames.length} regular season Week 1 games for ${currentSeason}`)
        if (regularGames.length > 0) {
            const sampleGame = regularGames[0]
            console.log('Sample game:', {
                id: sampleGame.game.id,
                stage: sampleGame.game.stage,
                date: sampleGame.game.date.date,
                homeTeam: sampleGame.teams.home.name,
                awayTeam: sampleGame.teams.away.name,
                homeScore: sampleGame.scores.home.total,
                awayScore: sampleGame.scores.away.total,
                status: sampleGame.game.status.short,
            })
        }

        // Test 2b: Fetch Playoff Games (2023 season - completed)
        console.log('\n--- Test 2b: Fetch Playoff Games (2023 season) ---')
        const playoffGames = await client.fetchPlayoffGames(2023)
        console.log(`Found ${playoffGames.length} playoff games for 2023 season`)
        if (playoffGames.length > 0) {
            const sampleGame = playoffGames[0]
            console.log('Sample game:', {
                id: sampleGame.game.id,
                stage: sampleGame.game.stage,
                date: sampleGame.game.date.date,
                homeTeam: sampleGame.teams.home.name,
                awayTeam: sampleGame.teams.away.name,
                homeScore: sampleGame.scores.home.total,
                awayScore: sampleGame.scores.away.total,
                status: sampleGame.game.status.short,
            })
        }

        // Test 3: Fetch Wild Card games specifically
        console.log('\n--- Test 3: Fetch Wild Card Games ---')
        const wildCardGames = await client.fetchGamesByWeek(
            currentSeason,
            1, // Wild Card is week 1 of postseason
            RAPIDAPI_SEASON_TYPES.POSTSEASON
        )
        console.log(`Found ${wildCardGames.length} Wild Card games`)

        // Test 4: Fetch a specific game by ID (if we have games)
        if (playoffGames.length > 0) {
            console.log('\n--- Test 4: Fetch Single Game by ID ---')
            const gameId = playoffGames[0].game.id
            console.log(`Fetching game ID: ${gameId}`)
            const singleGame = await client.fetchGameById(gameId)
            if (singleGame) {
                console.log('Game details:', {
                    id: singleGame.game.id,
                    matchup: `${singleGame.teams.away.code} @ ${singleGame.teams.home.code}`,
                    venue: singleGame.game.venue.name,
                    status: singleGame.game.status.long,
                    homeScore: singleGame.scores.home.total,
                    awayScore: singleGame.scores.away.total,
                })
            } else {
                console.log('Game not found')
            }
        }

        // Test 5: Fetch Live Scores (may be empty if no games in progress)
        console.log('\n--- Test 5: Fetch Live Scores ---')
        try {
            const liveGames = await client.fetchLiveScores()
            console.log(`Found ${liveGames.length} live games`)
            if (liveGames.length > 0) {
                liveGames.forEach(game => {
                    console.log(`  ${game.teams.away.code} @ ${game.teams.home.code}: ${game.scores.away.total}-${game.scores.home.total} (${game.game.status.short})`)
                })
            }
        } catch (error) {
            console.log('Live scores endpoint may not be available:', error instanceof Error ? error.message : error)
        }

        console.log('\n' + '='.repeat(60))
        console.log('All tests completed successfully!')
        console.log('='.repeat(60))

    } catch (error) {
        console.error('\nTest failed with error:', error)
        process.exit(1)
    }
}

// Run the tests
testRapidApi()
