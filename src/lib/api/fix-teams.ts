
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const TEAMS = [
    { code: 'ARI', city: 'Arizona', name: 'Cardinals' },
    { code: 'ATL', city: 'Atlanta', name: 'Falcons' },
    { code: 'BAL', city: 'Baltimore', name: 'Ravens' },
    { code: 'BUF', city: 'Buffalo', name: 'Bills' },
    { code: 'CAR', city: 'Carolina', name: 'Panthers' },
    { code: 'CHI', city: 'Chicago', name: 'Bears' },
    { code: 'CIN', city: 'Cincinnati', name: 'Bengals' },
    { code: 'CLE', city: 'Cleveland', name: 'Browns' },
    { code: 'DAL', city: 'Dallas', name: 'Cowboys' },
    { code: 'DEN', city: 'Denver', name: 'Broncos' },
    { code: 'DET', city: 'Detroit', name: 'Lions' },
    { code: 'GB', city: 'Green Bay', name: 'Packers' },
    { code: 'HOU', city: 'Houston', name: 'Texans' },
    { code: 'IND', city: 'Indianapolis', name: 'Colts' },
    { code: 'JAX', city: 'Jacksonville', name: 'Jaguars' },
    { code: 'KC', city: 'Kansas City', name: 'Chiefs' },
    { code: 'LV', city: 'Las Vegas', name: 'Raiders' },
    { code: 'LAC', city: 'Los Angeles', name: 'Chargers' },
    { code: 'LAR', city: 'Los Angeles', name: 'Rams' },
    { code: 'MIA', city: 'Miami', name: 'Dolphins' },
    { code: 'MIN', city: 'Minnesota', name: 'Vikings' },
    { code: 'NE', city: 'New England', name: 'Patriots' },
    { code: 'NO', city: 'New Orleans', name: 'Saints' },
    { code: 'NYG', city: 'New York', name: 'Giants' },
    { code: 'NYJ', city: 'New York', name: 'Jets' },
    { code: 'PHI', city: 'Philadelphia', name: 'Eagles' },
    { code: 'PIT', city: 'Pittsburgh', name: 'Steelers' },
    { code: 'SF', city: 'San Francisco', name: '49ers' },
    { code: 'SEA', city: 'Seattle', name: 'Seahawks' },
    { code: 'TB', city: 'Tampa Bay', name: 'Buccaneers' },
    { code: 'TEN', city: 'Tennessee', name: 'Titans' },
    { code: 'WAS', city: 'Washington', name: 'Commanders' }
]

async function fixTeams() {
    console.log('🛠 Fixing Team Names...')

    for (const team of TEAMS) {
        console.log(`Processing ${team.city} ${team.name} (${team.code})...`)

        const { error } = await supabase
            .from('teams')
            .update({
                city: team.city,
                name: team.name
            })
            .eq('abbreviation', team.code)

        if (error) {
            console.error(`❌ Error updating ${team.code}:`, error.message)
        }
    }
    console.log('✅ Teams updated.')
}

fixTeams()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error)
        process.exit(1)
    })
