-- Migration: Add Super Bowl total points tiebreaker
-- This adds a field for users to guess the total combined points in the Super Bowl
-- The tiebreaker is calculated as the absolute difference between guess and actual

-- Add total points guess to picks table (only used for Super Bowl picks)
ALTER TABLE picks ADD COLUMN IF NOT EXISTS superbowl_total_points_guess INTEGER;

-- Add tiebreaker difference to user_stats table
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS tiebreaker_difference INTEGER;

-- Add constraint to ensure valid point guesses (0-200 seems reasonable for NFL)
ALTER TABLE picks ADD CONSTRAINT valid_points_guess
  CHECK (superbowl_total_points_guess IS NULL OR (superbowl_total_points_guess >= 0 AND superbowl_total_points_guess <= 200));

-- Create index for Super Bowl picks with tiebreaker
CREATE INDEX IF NOT EXISTS idx_picks_superbowl_tiebreaker
  ON picks(user_id, week_number, superbowl_total_points_guess)
  WHERE week_number = 4;

-- Function to calculate tiebreaker for a user after Super Bowl is final
CREATE OR REPLACE FUNCTION calculate_superbowl_tiebreaker(p_season INTEGER)
RETURNS void AS $$
DECLARE
  v_actual_total INTEGER;
BEGIN
  -- Get the actual Super Bowl total score
  SELECT (home_team_score + away_team_score) INTO v_actual_total
  FROM games g
  JOIN playoff_rounds pr ON g.playoff_round_id = pr.id
  WHERE g.season = p_season
    AND pr.name = 'Super Bowl'
    AND g.status = 'final'
  LIMIT 1;

  -- If Super Bowl is not final yet, exit
  IF v_actual_total IS NULL THEN
    RETURN;
  END IF;

  -- Update user_stats with tiebreaker difference
  UPDATE user_stats us
  SET tiebreaker_difference = (
    SELECT ABS(p.superbowl_total_points_guess - v_actual_total)
    FROM picks p
    JOIN games g ON p.game_id = g.id
    JOIN playoff_rounds pr ON g.playoff_round_id = pr.id
    WHERE p.user_id = us.user_id
      AND p.season = p_season
      AND pr.name = 'Super Bowl'
      AND p.superbowl_total_points_guess IS NOT NULL
    LIMIT 1
  )
  WHERE us.season = p_season;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN picks.superbowl_total_points_guess IS 'User guess for total combined points in Super Bowl (tiebreaker)';
COMMENT ON COLUMN user_stats.tiebreaker_difference IS 'Absolute difference between Super Bowl total points guess and actual score (lower is better)';
COMMENT ON FUNCTION calculate_superbowl_tiebreaker(INTEGER) IS 'Calculates Super Bowl tiebreaker difference for all users in a season';
