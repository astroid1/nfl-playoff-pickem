require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NFL_API_KEY = process.env.NFL_API_KEY;

// Map API team names to DB abbreviations
const TEAM_MAP = {
  'Seattle Seahawks': 'SEA',
  'New England Patriots': 'NE',
  'Philadelphia Eagles': 'PHI',
  'Kansas City Chiefs': 'KC',
  'San Francisco 49ers': 'SF',
  'Buffalo Bills': 'BUF',
  'Baltimore Ravens': 'BAL',
  'Detroit Lions': 'DET',
  'Houston Texans': 'HOU',
  'Green Bay Packers': 'GB',
  'Tampa Bay Buccaneers': 'TB',
  'Los Angeles Rams': 'LAR',
  'Washington Commanders': 'WAS',
  'Minnesota Vikings': 'MIN',
  'Pittsburgh Steelers': 'PIT',
  'Denver Broncos': 'DEN',
  'Los Angeles Chargers': 'LAC',
};

async function sync() {
  const date = '2026-02-08';
  console.log('Fetching games for', date);

  const res = await fetch(`https://v1.american-football.api-sports.io/games?league=1&date=${date}`, {
    headers: { 'x-apisports-key': NFL_API_KEY }
  });

  const data = await res.json();
  console.log('API Results:', data.results);

  if (!data.response || data.response.length === 0) {
    console.log('No games found');
    return;
  }

  for (const game of data.response) {
    const apiHome = game.teams?.home;
    const apiAway = game.teams?.away;
    const scores = game.scores;
    const status = game.game?.status;

    const apiHomeAbbr = TEAM_MAP[apiHome?.name] || apiHome?.code;
    const apiAwayAbbr = TEAM_MAP[apiAway?.name] || apiAway?.code;

    console.log(`\nAPI: ${apiAway?.name} (${apiAwayAbbr}) @ ${apiHome?.name} (${apiHomeAbbr})`);
    console.log(`  API Score: ${apiAwayAbbr} ${scores?.away?.total || 0} - ${apiHomeAbbr} ${scores?.home?.total || 0}`);
    console.log(`  Status: ${status?.short} (${status?.long}) | Timer: ${status?.timer || ''}`);

    // Extract quarter number from status.short (e.g., "Q1" -> 1, "Q2" -> 2, "OT" -> 5)
    let quarterNum = null;
    const shortStatus = status?.short?.toUpperCase();
    if (shortStatus === 'Q1') quarterNum = 1;
    else if (shortStatus === 'Q2') quarterNum = 2;
    else if (shortStatus === 'Q3') quarterNum = 3;
    else if (shortStatus === 'Q4') quarterNum = 4;
    else if (shortStatus === 'OT') quarterNum = 5;
    else if (shortStatus === 'HT') quarterNum = 2; // Halftime is after Q2

    // Get Super Bowl game from DB
    const { data: dbGame } = await supabase
      .from('games')
      .select('id, home_team_id, away_team_id, home_team:teams!home_team_id(name, abbreviation), away_team:teams!away_team_id(name, abbreviation)')
      .eq('season', 2025)
      .eq('week_number', 4)
      .single();

    if (!dbGame) {
      console.log('  No Super Bowl game found in DB');
      continue;
    }

    const dbHomeAbbr = dbGame.home_team?.abbreviation;
    const dbAwayAbbr = dbGame.away_team?.abbreviation;
    console.log(`  DB: ${dbAwayAbbr} @ ${dbHomeAbbr}`);

    // Match API teams to DB teams and get correct scores
    let dbHomeScore, dbAwayScore;

    if (apiHomeAbbr === dbHomeAbbr) {
      // API home = DB home
      dbHomeScore = scores?.home?.total || 0;
      dbAwayScore = scores?.away?.total || 0;
    } else if (apiHomeAbbr === dbAwayAbbr) {
      // API home = DB away (teams are swapped)
      dbHomeScore = scores?.away?.total || 0;
      dbAwayScore = scores?.home?.total || 0;
    } else {
      console.log('  ❌ Could not match teams!');
      continue;
    }

    console.log(`  Mapped Score: ${dbAwayAbbr} ${dbAwayScore} - ${dbHomeAbbr} ${dbHomeScore}`);

    // Map status (shortStatus already defined above)
    let dbStatus = 'scheduled';
    if (['Q1', 'Q2', 'Q3', 'Q4', 'HT', 'OT', 'IN'].includes(shortStatus)) {
      dbStatus = 'in_progress';
    } else if (['FT', 'AOT', 'POST'].includes(shortStatus)) {
      dbStatus = 'final';
    }

    // Determine winner if final
    let winningTeamId = null;
    if (dbStatus === 'final') {
      if (dbHomeScore > dbAwayScore) winningTeamId = dbGame.home_team_id;
      else if (dbAwayScore > dbHomeScore) winningTeamId = dbGame.away_team_id;
    }

    console.log(`  Quarter: ${quarterNum} | Clock: ${status?.timer || 'N/A'}`);

    // Update DB
    const { error } = await supabase
      .from('games')
      .update({
        status: dbStatus,
        home_team_score: dbHomeScore,
        away_team_score: dbAwayScore,
        quarter: quarterNum,
        game_clock: status?.timer || null,
        winning_team_id: winningTeamId,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', dbGame.id);

    if (error) {
      console.log('  ❌ Error:', error.message);
    } else {
      console.log('  ✅ Updated!');
    }
  }

  console.log('\nCalculating points...');
  await supabase.rpc('calculate_points_for_completed_games');
  console.log('Refreshing stats...');
  await supabase.rpc('refresh_user_stats', { p_season: 2025 });
  console.log('Done!');
}

sync();
