/**
 * Test NFL API connection
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
        // Test 1: Check API status
        console.log('Test 1: Checking API status...')
        const statusResponse = await fetch(`${NFL_API_BASE_URL}/status`, {
            method: 'GET',
            headers: {
                'x-apisports-key': NFL_API_KEY,
            },
        })

        console.log(`Status Code: ${statusResponse.status}`)

        if (!statusResponse.ok) {
            const errorText = await statusResponse.text()
            console.error(`❌ API request failed: ${statusResponse.status} ${statusResponse.statusText}`)
            console.error('Response:', errorText)
            process.exit(1)
        }

        const statusData = await statusResponse.json()
        console.log('✅ API Status:', JSON.stringify(statusData, null, 2))

        // Test 2: Fetch teams
        console.log('\nTest 2: Fetching NFL teams...')
        const teamsResponse = await fetch(`${NFL_API_BASE_URL}/teams?league=1&season=2025`, {
            method: 'GET',
            headers: {
                'x-apisports-key': NFL_API_KEY,
            },
        })

        console.log(`Status Code: ${teamsResponse.status}`)

        if (!teamsResponse.ok) {
            const errorText = await teamsResponse.text()
            console.error(`❌ Teams request failed: ${teamsResponse.status} ${teamsResponse.statusText}`)
            console.error('Response:', errorText)
            process.exit(1)
        }

        const teamsData = await teamsResponse.json()
        console.log(`✅ Found ${teamsData.results} teams`)

        // Show rate limit info
        const rateLimit = teamsResponse.headers.get('x-ratelimit-requests-limit')
        const rateLimitRemaining = teamsResponse.headers.get('x-ratelimit-requests-remaining')

        if (rateLimit && rateLimitRemaining) {
            console.log(`\n📊 Rate Limit: ${rateLimitRemaining}/${rateLimit} remaining`)
        }

        console.log('\n🎉 API connection successful!')

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

testApi()
