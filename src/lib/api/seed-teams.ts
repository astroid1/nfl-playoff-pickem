/**
 * Seed NFL teams into the database
 * Run with: npx tsx src/lib/api/seed-teams.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { NFLApiClient } from './nfl-client'
import { extractConference, extractDivision } from '../types/nfl-api-types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const NFL_API_KEY = process.env.NFL_API_KEY!
const NFL_API_BASE_URL = process.env.NFL_API_BASE_URL || 'https://v1.american-football.api-sports.io'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

if (!NFL_API_KEY) {
    console.error('Missing required environment variable: NFL_API_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const nflClient = new NFLApiClient(NFL_API_KEY, NFL_API_BASE_URL)

async function seedTeams() {
    console.log('🏈 Starting NFL teams seed...')

    try {
        // Fetch teams from API-Sports
        console.log('Fetching teams from API-Sports...')
        const teams = await nflClient.fetchTeams(1, 2024) // NFL league ID = 1, season 2024

        console.log(`Found ${teams.length} teams`)

        // Insert/update teams in database
        let inserted = 0
        let updated = 0
        let errors = 0

        for (const team of teams) {
            try {
                const conference = extractConference(team)
                const division = extractDivision(team)

                const teamData = {
                    api_team_id: String(team.id),
                    city: team.city || team.name, // Some teams might not have separate city
                    name: team.name,
                    abbreviation: team.code,
                    logo_url: team.logo,
                    conference,
                    division,
                }

                // Try to insert, update on conflict
                const { data, error } = await supabase
                    .from('teams')
                    .upsert(teamData, {
                        onConflict: 'api_team_id',
                        ignoreDuplicates: false,
                    })
                    .select()

                if (error) {
                    console.error(`Error upserting team ${team.name}:`, error.message)
                    errors++
                } else {
                    if (data && data.length > 0) {
                        console.log(`✅ Upserted: ${team.name} (${team.code})`)
                        updated++
                    } else {
                        inserted++
                    }
                }
            } catch (error) {
                console.error(`Failed to process team ${team.name}:`, error)
                errors++
            }
        }

        console.log('\n📊 Seed Summary:')
        console.log(`  Total teams processed: ${teams.length}`)
        console.log(`  Successfully upserted: ${inserted + updated}`)
        console.log(`  Errors: ${errors}`)

        // Verify teams in database
        const { count } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true })

        console.log(`\n✅ Total teams in database: ${count}`)

    } catch (error) {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    }
}

// Run the seed
seedTeams()
    .then(() => {
        console.log('\n🎉 Teams seed completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Seed failed:', error)
        process.exit(1)
    })
