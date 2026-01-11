import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    // Try profiles table
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(2)
    console.log('Profiles:', profiles, profErr?.message)

    // Try users table
    const { data: users, error: usersErr } = await supabase.from('users').select('*').limit(2)
    console.log('Users:', users, usersErr?.message)

    // Show leaderboard with profiles
    const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(10)

    if (stats) {
        const userIds = stats.map(s => s.user_id)
        const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', userIds)
        const nameMap = new Map(profs?.map(p => [p.id, p.display_name || p.username]) || [])

        console.log('\n📊 Leaderboard:')
        stats.forEach((s, i) => {
            const name = nameMap.get(s.user_id) || s.user_id.slice(0, 8)
            console.log(`  ${i+1}. ${name}: ${s.total_points} pts (${s.total_correct_picks} correct, ${s.total_incorrect_picks} wrong)`)
        })
    }
}
check().then(() => process.exit(0))
