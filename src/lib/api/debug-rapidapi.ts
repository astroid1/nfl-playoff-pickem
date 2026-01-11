/**
 * Debug script to inspect raw RapidAPI responses
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'nfl-api-data.p.rapidapi.com'
const BASE_URL = 'https://nfl-api-data.p.rapidapi.com'

async function fetchRaw(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(endpoint, BASE_URL)
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            url.searchParams.append(key, String(value))
        }
    })

    console.log(`\nFetching: ${url.toString()}`)

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY!,
            'x-rapidapi-host': RAPIDAPI_HOST,
        },
    })

    const text = await response.text()
    console.log('Status:', response.status)

    try {
        return JSON.parse(text)
    } catch {
        console.log('Raw response:', text.slice(0, 500))
        return null
    }
}

async function debug() {
    console.log('=== RapidAPI Debug ===\n')

    // Test 0: Team list (this worked before)
    console.log('--- Test: /nfl-team-list ---')
    const teams = await fetchRaw('/nfl-team-list')
    if (teams) {
        console.log('Response keys:', Object.keys(teams))
        console.log('Teams count:', teams.teams?.length || 0)
    }

    // Test 1: Simple scoreboard (no params)
    console.log('\n--- Test: /nfl-scoreboard (no params) ---')
    const scoreboard = await fetchRaw('/nfl-scoreboard')
    if (scoreboard) {
        console.log('Response keys:', Object.keys(scoreboard))
        console.log('Events count:', scoreboard.events?.length || 0)
        if (scoreboard.events?.length > 0) {
            console.log('First event ID:', scoreboard.events[0].id)
        }
        if (scoreboard.season) {
            console.log('Season info:', scoreboard.season)
        }
        if (scoreboard.week) {
            console.log('Week info:', scoreboard.week)
        }
    }

    // Test 2: Scoreboard with year
    console.log('\n--- Test: /nfl-scoreboard?year=2024 ---')
    const scoreboard2024 = await fetchRaw('/nfl-scoreboard', { year: 2024 })
    if (scoreboard2024) {
        console.log('Events count:', scoreboard2024.events?.length || 0)
    }

    // Test 3: Scoreboard by week type
    console.log('\n--- Test: /nfl-scoreboard-week-type?year=2024&week=1&seasontype=2 ---')
    const weekGames = await fetchRaw('/nfl-scoreboard-week-type', {
        year: 2024,
        week: 1,
        seasontype: 2,
    })
    if (weekGames) {
        console.log('Response keys:', Object.keys(weekGames))
        console.log('Events count:', weekGames.events?.length || 0)
    }

    // Test 4: Try different param names
    console.log('\n--- Test: /nfl-scoreboard-week-type?year=2023&week=1&seasontype=3 (playoffs) ---')
    const playoffGames = await fetchRaw('/nfl-scoreboard-week-type', {
        year: 2023,
        week: 1,
        seasontype: 3,
    })
    if (playoffGames) {
        console.log('Events count:', playoffGames.events?.length || 0)
        // Print first event if available
        if (playoffGames.events?.length > 0) {
            console.log('First playoff game:', JSON.stringify(playoffGames.events[0], null, 2).slice(0, 1000))
        }
    }

    console.log('\n=== Debug Complete ===')
}

debug().catch(console.error)
