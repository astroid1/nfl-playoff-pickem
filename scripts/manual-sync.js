const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://brzjacbfqfnyxrwaudtl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyemphY2JmcWZueXhyd2F1ZHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgzNzk4MSwiZXhwIjoyMDgzNDEzOTgxfQ.rDcRov3w6LOISD1eWkd2kgNz1M3VjZH_tWwEelRJZv0'
);

async function syncScores() {
  console.log('=== Manual Score Sync ===');
  console.log('Time:', new Date().toISOString());

  // Fetch from RapidAPI
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

  console.log('Fetching from RapidAPI for date:', dateStr);

  const response = await fetch('https://nfl-api-data.p.rapidapi.com/nfl-scoreboard-day?day=' + dateStr, {
    headers: {
      'x-rapidapi-key': '874e02a48emshe1aaa7d89f17d60p1030ddjsn5cabcf8fd835',
      'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com'
    }
  });

  const data = await response.json();
  console.log('API returned', data.events?.length || 0, 'games');

  if (data.events) {
    data.events.forEach(e => {
      const comp = e.competitions?.[0];
      if (comp) {
        const home = comp.competitors?.find(c => c.homeAway === 'home');
        const away = comp.competitors?.find(c => c.homeAway === 'away');
        console.log('  -', away?.team?.abbreviation + '@' + home?.team?.abbreviation,
                    ':', comp.status?.type?.state, away?.score + '-' + home?.score);
      }
    });
  }

  // Get active games from DB
  const { data: activeGames, error } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, status, home_team:teams!home_team_id(abbreviation), away_team:teams!away_team_id(abbreviation)')
    .in('status', ['scheduled', 'in_progress']);

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log('\nFound', activeGames.length, 'active games in DB');

  for (const dbGame of activeGames) {
    const homeAbbr = dbGame.home_team?.abbreviation;
    const awayAbbr = dbGame.away_team?.abbreviation;

    // Find matching game in API response
    const apiEvent = data.events?.find(e => {
      const comp = e.competitions?.[0];
      if (!comp) return false;
      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      return home?.team?.abbreviation === homeAbbr && away?.team?.abbreviation === awayAbbr;
    });

    if (!apiEvent) {
      console.log('No API match for', awayAbbr + '@' + homeAbbr);
      continue;
    }

    const comp = apiEvent.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    const status = comp.status;

    // Map status
    let newStatus = 'scheduled';
    if (status.type.state === 'in') newStatus = 'in_progress';
    else if (status.type.state === 'post') newStatus = 'final';

    const homeScore = parseInt(home.score) || 0;
    const awayScore = parseInt(away.score) || 0;
    const quarter = status.period || null;
    const gameClock = status.displayClock || null;

    // Determine winner if final
    let winningTeamId = null;
    if (newStatus === 'final') {
      if (homeScore > awayScore) winningTeamId = dbGame.home_team_id;
      else if (awayScore > homeScore) winningTeamId = dbGame.away_team_id;
    }

    // Update game
    const updateData = {
      status: newStatus,
      home_team_score: homeScore,
      away_team_score: awayScore,
      winning_team_id: winningTeamId,
      quarter: quarter,
      game_clock: gameClock,
      last_updated_at: new Date().toISOString(),
      is_locked: newStatus === 'in_progress' || newStatus === 'final'
    };

    if (!dbGame.locked_at && (newStatus === 'in_progress' || newStatus === 'final')) {
      updateData.locked_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', dbGame.id);

    if (updateError) {
      console.error('Update error for', awayAbbr + '@' + homeAbbr, updateError);
    } else {
      console.log('Updated', awayAbbr + '@' + homeAbbr + ':', newStatus, awayScore + '-' + homeScore, 'Q' + quarter, gameClock);
    }
  }

  // Calculate points
  console.log('\nCalculating points...');
  const { error: calcError } = await supabase.rpc('calculate_points_for_completed_games');
  if (calcError) console.error('Points calc error:', calcError);
  else console.log('Points calculated');

  // Refresh stats
  console.log('Refreshing stats...');
  const { error: statsError } = await supabase.rpc('refresh_user_stats', { p_season: 2025 });
  if (statsError) console.error('Stats refresh error:', statsError);
  else console.log('Stats refreshed');

  console.log('\n=== Sync Complete ===');
}

syncScores().catch(console.error);
