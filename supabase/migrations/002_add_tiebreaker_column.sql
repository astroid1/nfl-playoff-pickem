-- Migration to add tiebreaker column to picks table
ALTER TABLE picks
ADD COLUMN IF NOT EXISTS superbowl_total_points_guess INTEGER;

COMMENT ON COLUMN picks.superbowl_total_points_guess IS 'User''s guess for total combined points in Super Bowl (secondary tiebreaker)';
