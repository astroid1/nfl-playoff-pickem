-- Add is_auto_pick column to track system-generated picks for users who missed the deadline
-- Auto-picks are randomly assigned when a game locks if a user hasn't made a pick

ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN picks.is_auto_pick IS 'True if this pick was automatically generated for a user who missed the deadline';
