/**
 * Test NFL API connection and inspect score structure
 * Run with: npx tsx src/lib/api/test-api.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const NFL_API_KEY = process.env.NFL_API_KEY
const NFL_API_BASE_URL = process.env.NFL_API_BASE_URL || 'https://v1.american-football.api-sports.io'

async function testApi() {
    console.log('🏈 Testing NFL API connection...\n')

    if (!NFL_API_KEY) {
        console.error('❌ NFL_API_KEY is not set in .env.local')
        process.exit(1)
    }

    console.log(`API Key: ${NFL_API_KEY.substring(0, 10)}...`)
    console.log(`Base URL: ${NFL_API_BASE_URL}\n`)

    try {
        // Fetch games for 2024 season (playoffs are 2024-2025)
        console.log('Fetching 2024 season games...')
        const gamesResponse = await fetch(`${NFL_API_BASE_URL}/games?league=1&season=2024`, {
            method: 'GET',
            headers: {
                'x-apisports-key': NFL_API_KEY,
            },
        })

        if (!gamesResponse.ok) {
            console.error(`❌ Request failed: ${gamesResponse.status}`)
            process.exit(1)
        }

        const gamesData = await gamesResponse.json()
        console.log(`Found ${gamesData.results} games`)

        // Find playoff games
        const playoffGames = gamesData.response.filter((g: any) => {
            const week = g.game?.week?.toLowerCase() || ''
            return week.includes('wild') ||
                   week.includes('divisional') ||
                   week.includes('conference') ||
                   week.includes('super')
        })

        console.log(`Found ${playoffGames.length} playoff games\n`)

        // Show score structure from a completed game
        const completedGame = playoffGames.find((g: any) => g.game?.status?.short === 'FT')
        if (completedGame) {
            console.log('=== COMPLETED GAME STRUCTURE ===')
            console.log('Game ID:', completedGame.game.id)
            console.log('Status:', completedGame.game.status)
            console.log('Week:', completedGame.game.week)
            console.log('Teams:', completedGame.teams.home.name, 'vs', completedGame.teams.away.name)
            console.log('')
            console.log('SCORES OBJECT:')
            console.log(JSON.stringify(completedGame.scores, null, 2))
            console.log('')
            console.log('Possible score access patterns:')
            console.log('  scores.home:', completedGame.scores?.home)
            console.log('  scores.away:', completedGame.scores?.away)
            console.log('  scores.home.total:', completedGame.scores?.home?.total)
            console.log('  scores.away.total:', completedGame.scores?.away?.total)
            console.log('  scores.home.home:', completedGame.scores?.home?.home)
            console.log('  scores.away.away:', completedGame.scores?.away?.away)
        }

        // Show a live game if any
        const liveGame = gamesData.response.find((g: any) => {
            const status = g.game?.status?.short
            return status && !['NS', 'FT', 'AET', 'PEN'].includes(status)
        })

        if (liveGame) {
            console.log('\n=== LIVE GAME STRUCTURE ===')
            console.log(JSON.stringify(liveGame, null, 2))
        }

        // Show rate limit
        const rateLimitRemaining = gamesResponse.headers.get('x-ratelimit-requests-remaining')
        const rateLimit = gamesResponse.headers.get('x-ratelimit-requests-limit')
        console.log(`\n📊 Rate Limit: ${rateLimitRemaining}/${rateLimit} remaining`)

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

testApi()
