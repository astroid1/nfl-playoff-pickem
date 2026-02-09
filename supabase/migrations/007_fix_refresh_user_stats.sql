-- Fix refresh_user_stats function to properly count round breakdowns
-- The original function wasn't properly joining/counting Conference picks

CREATE OR REPLACE FUNCTION refresh_user_stats(p_season INTEGER)
RETURNS void AS $$
BEGIN
  -- Delete existing stats for this season to ensure clean state
  DELETE FROM user_stats WHERE season = p_season;

  -- Insert fresh stats
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
  GROUP BY p.user_id, p.season;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_user_stats(INTEGER) IS 'Refreshes user statistics - fixed version that properly deletes old stats first';
