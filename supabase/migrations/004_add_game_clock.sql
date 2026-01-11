-- Add game clock columns for live score display
ALTER TABLE games ADD COLUMN IF NOT EXISTS quarter INTEGER DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_clock TEXT DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS possession_team_id INTEGER DEFAULT NULL REFERENCES teams(id);

COMMENT ON COLUMN games.quarter IS 'Current quarter (1-4, 5 for OT)';
COMMENT ON COLUMN games.game_clock IS 'Display clock string (e.g., "12:34")';
COMMENT ON COLUMN games.possession_team_id IS 'Team currently with possession';
