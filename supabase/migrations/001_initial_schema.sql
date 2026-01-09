-- NFL Playoff Pick'em Database Schema
-- This migration creates all tables, indexes, RLS policies, functions, and triggers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3 AND length(username) <= 30),
  display_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  notification_preferences JSONB DEFAULT '{"game_reminders": true, "weekly_recap": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);

-- NFL Teams (relatively static, will be seeded)
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  api_team_id TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  conference TEXT CHECK (conference IN ('AFC', 'NFC')),
  division TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX idx_teams_api_id ON teams(api_team_id);

-- Playoff rounds (for point calculation)
CREATE TABLE IF NOT EXISTS playoff_rounds (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  points_per_correct_pick INTEGER NOT NULL,
  round_order INTEGER UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed playoff rounds data
INSERT INTO playoff_rounds (name, points_per_correct_pick, round_order) VALUES
  ('Wild Card', 2, 1),
  ('Divisional', 3, 2),
  ('Conference', 4, 3),
  ('Super Bowl', 5, 4)
ON CONFLICT (name) DO NOTHING;

-- NFL Games
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  api_game_id TEXT UNIQUE NOT NULL,
  season INTEGER NOT NULL,
  playoff_round_id INTEGER NOT NULL REFERENCES playoff_rounds(id),
  week_number INTEGER NOT NULL,

  home_team_id INTEGER NOT NULL REFERENCES teams(id),
  away_team_id INTEGER NOT NULL REFERENCES teams(id),

  scheduled_start_time TIMESTAMPTZ NOT NULL,
  actual_start_time TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'final', 'postponed', 'cancelled')
  ),

  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,

  home_team_score INTEGER,
  away_team_score INTEGER,
  winning_team_id INTEGER REFERENCES teams(id),

  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT different_teams CHECK (home_team_id != away_team_id),
  CONSTRAINT valid_winner CHECK (
    winning_team_id IS NULL OR
    winning_team_id = home_team_id OR
    winning_team_id = away_team_id
  )
);

CREATE INDEX idx_games_season_round ON games(season, playoff_round_id);
CREATE INDEX idx_games_scheduled_start ON games(scheduled_start_time);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_is_locked ON games(is_locked);
CREATE INDEX idx_games_api_id ON games(api_game_id);
CREATE INDEX idx_games_week ON games(season, week_number);

-- User picks (ONE entry per user per week)
CREATE TABLE IF NOT EXISTS picks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  week_number INTEGER NOT NULL,

  selected_team_id INTEGER NOT NULL REFERENCES teams(id),

  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,

  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_pick_per_game_per_user UNIQUE (user_id, game_id)
);

CREATE INDEX idx_picks_user_season ON picks(user_id, season);
CREATE INDEX idx_picks_game ON picks(game_id);
CREATE INDEX idx_picks_user_week ON picks(user_id, season, week_number);
CREATE INDEX idx_picks_locked ON picks(is_locked);

-- User statistics (materialized view for performance)
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,

  total_points INTEGER DEFAULT 0,
  total_correct_picks INTEGER DEFAULT 0,
  total_incorrect_picks INTEGER DEFAULT 0,
  total_pending_picks INTEGER DEFAULT 0,

  wildcard_correct INTEGER DEFAULT 0,
  divisional_correct INTEGER DEFAULT 0,
  championship_correct INTEGER DEFAULT 0,
  superbowl_correct INTEGER DEFAULT 0,

  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_season UNIQUE (user_id, season)
);

CREATE INDEX idx_user_stats_season_points ON user_stats(season, total_points DESC);
CREATE INDEX idx_user_stats_user ON user_stats(user_id);

-- Audit log for picks (for debugging and dispute resolution)
CREATE TABLE IF NOT EXISTS pick_audit_log (
  id SERIAL PRIMARY KEY,
  pick_id INTEGER NOT NULL REFERENCES picks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  game_id INTEGER NOT NULL REFERENCES games(id),

  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'locked')),
  old_selected_team_id INTEGER REFERENCES teams(id),
  new_selected_team_id INTEGER REFERENCES teams(id),

  game_was_locked BOOLEAN NOT NULL,
  game_scheduled_start TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_pick ON pick_audit_log(pick_id);
CREATE INDEX idx_audit_user ON pick_audit_log(user_id);

-- API sync log (track API health and rate limits)
CREATE TABLE IF NOT EXISTS api_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('games', 'scores', 'teams')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  api_provider TEXT NOT NULL,

  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  response_time_ms INTEGER,

  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_sync_type_status ON api_sync_log(sync_type, status, completed_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Lock picks when game starts
CREATE OR REPLACE FUNCTION lock_picks_for_started_games()
RETURNS void AS $$
BEGIN
  UPDATE picks
  SET
    is_locked = TRUE,
    locked_at = NOW()
  FROM games
  WHERE
    picks.game_id = games.id
    AND picks.is_locked = FALSE
    AND games.is_locked = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate points for completed games
CREATE OR REPLACE FUNCTION calculate_points_for_completed_games()
RETURNS void AS $$
BEGIN
  -- Update picks with correctness and points
  UPDATE picks
  SET
    is_correct = (picks.selected_team_id = games.winning_team_id),
    points_earned = CASE
      WHEN picks.selected_team_id = games.winning_team_id
      THEN playoff_rounds.points_per_correct_pick
      ELSE 0
    END
  FROM games
  JOIN playoff_rounds ON games.playoff_round_id = playoff_rounds.id
  WHERE
    picks.game_id = games.id
    AND games.status = 'final'
    AND games.winning_team_id IS NOT NULL
    AND picks.is_correct IS NULL; -- Only process unscored picks
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Refresh user statistics
CREATE OR REPLACE FUNCTION refresh_user_stats(p_season INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO user_stats (
    user_id,
    season,
    total_points,
    total_correct_picks,
    total_incorrect_picks,
    total_pending_picks,
    wildcard_correct,
    divisional_correct,
    championship_correct,
    superbowl_correct,
    last_calculated_at
  )
  SELECT
    p.user_id,
    p.season,
    COALESCE(SUM(p.points_earned), 0) as total_points,
    COUNT(*) FILTER (WHERE p.is_correct = TRUE) as total_correct_picks,
    COUNT(*) FILTER (WHERE p.is_correct = FALSE) as total_incorrect_picks,
    COUNT(*) FILTER (WHERE p.is_correct IS NULL) as total_pending_picks,
    COUNT(*) FILTER (WHERE p.is_correct = TRUE AND pr.name = 'Wild Card') as wildcard_correct,
    COUNT(*) FILTER (WHERE p.is_correct = TRUE AND pr.name = 'Divisional') as divisional_correct,
    COUNT(*) FILTER (WHERE p.is_correct = TRUE AND pr.name = 'Conference') as championship_correct,
    COUNT(*) FILTER (WHERE p.is_correct = TRUE AND pr.name = 'Super Bowl') as superbowl_correct,
    NOW()
  FROM picks p
  JOIN games g ON p.game_id = g.id
  JOIN playoff_rounds pr ON g.playoff_round_id = pr.id
  WHERE p.season = p_season
  GROUP BY p.user_id, p.season
  ON CONFLICT (user_id, season)
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    total_correct_picks = EXCLUDED.total_correct_picks,
    total_incorrect_picks = EXCLUDED.total_incorrect_picks,
    total_pending_picks = EXCLUDED.total_pending_picks,
    wildcard_correct = EXCLUDED.wildcard_correct,
    divisional_correct = EXCLUDED.divisional_correct,
    championship_correct = EXCLUDED.championship_correct,
    superbowl_correct = EXCLUDED.superbowl_correct,
    last_calculated_at = EXCLUDED.last_calculated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_picks_updated_at BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Prevent locked pick updates (CRITICAL SECURITY)
CREATE OR REPLACE FUNCTION prevent_locked_pick_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM games
    WHERE id = NEW.game_id
    AND is_locked = TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot modify pick for locked game';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_game_lock_before_pick_update
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_pick_updates();

-- Trigger: Audit pick changes
CREATE OR REPLACE FUNCTION audit_pick_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_game_locked BOOLEAN;
  v_game_start TIMESTAMPTZ;
BEGIN
  SELECT is_locked, scheduled_start_time
  INTO v_game_locked, v_game_start
  FROM games WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO pick_audit_log (
      pick_id, user_id, game_id, action,
      new_selected_team_id, game_was_locked, game_scheduled_start
    ) VALUES (
      NEW.id, NEW.user_id, NEW.game_id, 'created',
      NEW.selected_team_id, v_game_locked, v_game_start
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.selected_team_id != NEW.selected_team_id THEN
    INSERT INTO pick_audit_log (
      pick_id, user_id, game_id, action,
      old_selected_team_id, new_selected_team_id,
      game_was_locked, game_scheduled_start
    ) VALUES (
      NEW.id, NEW.user_id, NEW.game_id, 'updated',
      OLD.selected_team_id, NEW.selected_team_id,
      v_game_locked, v_game_start
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_picks AFTER INSERT OR UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION audit_pick_changes();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, but only update their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Picks: Users can only see/modify their own picks
-- Exception: Can see others' picks ONLY for locked games
CREATE POLICY "Users can view their own picks anytime"
  ON picks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' picks for locked games"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = picks.game_id
      AND games.is_locked = TRUE
    )
  );

CREATE POLICY "Users can insert their own picks for unlocked games"
  ON picks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_id
      AND is_locked = TRUE
    )
  );

CREATE POLICY "Users can update their own picks for unlocked games"
  ON picks FOR UPDATE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM games
      WHERE games.id = picks.game_id
      AND is_locked = TRUE
    )
  );

-- User stats: Everyone can read, only system can write
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT
  USING (true);

-- Games and teams: Public read-only (no user writes)
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE teams IS 'NFL teams with logos and conference info';
COMMENT ON TABLE playoff_rounds IS 'Playoff rounds with point values';
COMMENT ON TABLE games IS 'NFL playoff games with scores and lock status';
COMMENT ON TABLE picks IS 'User picks for each game';
COMMENT ON TABLE user_stats IS 'Materialized user statistics for leaderboard';
COMMENT ON TABLE pick_audit_log IS 'Audit trail for all pick changes';
COMMENT ON TABLE api_sync_log IS 'Log of API sync operations';

COMMENT ON FUNCTION lock_picks_for_started_games() IS 'Locks all picks for games that have started';
COMMENT ON FUNCTION calculate_points_for_completed_games() IS 'Calculates points for completed games';
COMMENT ON FUNCTION refresh_user_stats(INTEGER) IS 'Refreshes materialized user statistics';
