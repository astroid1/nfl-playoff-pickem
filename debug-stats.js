require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const season = 2025;

  console.log('=== Deleting old stats ===');
  await supabase.from('user_stats').delete().eq('season', season);

  console.log('=== Running manual stats calculation ===');

  // Get all picks with game and round info
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      user_id,
      points_earned,
      is_correct,
      game:games!inner(
        playoff_round:playoff_rounds!inner(name)
      )
    `)
    .eq('season', season);

  // Aggregate by user
  const userStats = {};
  picks?.forEach(p => {
    const uid = p.user_id;
    if (!userStats[uid]) {
      userStats[uid] = {
        user_id: uid,
        season: season,
        total_points: 0,
        total_correct_picks: 0,
        total_incorrect_picks: 0,
        total_pending_picks: 0,
        wildcard_correct: 0,
        divisional_correct: 0,
        championship_correct: 0,
        superbowl_correct: 0
      };
    }

    userStats[uid].total_points += p.points_earned || 0;

    if (p.is_correct === true) {
      userStats[uid].total_correct_picks++;
      const round = p.game?.playoff_round?.name;
      if (round === 'Wild Card') userStats[uid].wildcard_correct++;
      if (round === 'Divisional') userStats[uid].divisional_correct++;
      if (round === 'Conference') userStats[uid].championship_correct++;
      if (round === 'Super Bowl') userStats[uid].superbowl_correct++;
    } else if (p.is_correct === false) {
      userStats[uid].total_incorrect_picks++;
    } else {
      userStats[uid].total_pending_picks++;
    }
  });

  // Insert into user_stats
  const statsArray = Object.values(userStats);
  console.log('Inserting', statsArray.length, 'user stats');

  const { error: insertError } = await supabase
    .from('user_stats')
    .insert(statsArray);

  if (insertError) {
    console.log('Insert error:', insertError.message);
  } else {
    console.log('Stats inserted successfully!');
  }

  // Verify
  console.log('\n=== Updated User Stats ===');
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*, profile:profiles(username)')
    .eq('season', season)
    .order('total_points', { ascending: false });

  console.table(stats?.map(s => ({
    user: s.profile?.username,
    pts: s.total_points,
    correct: s.total_correct_picks,
    wc: s.wildcard_correct,
    div: s.divisional_correct,
    conf: s.championship_correct,
    sb: s.superbowl_correct
  })));
}

fix();
