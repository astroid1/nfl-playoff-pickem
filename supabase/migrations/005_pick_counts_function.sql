-- Create a function to get pick counts per user for a specific week
-- This bypasses RLS to return just the count (not the actual picks)
-- which is safe to share since it doesn't reveal who they picked

CREATE OR REPLACE FUNCTION get_weekly_pick_counts(p_season INTEGER, p_week INTEGER)
RETURNS TABLE (
    user_id UUID,
    picks_made BIGINT,
    correct_picks BIGINT,
    incorrect_picks BIGINT,
    pending_picks BIGINT,
    total_points BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.user_id,
        COUNT(*)::BIGINT as picks_made,
        COUNT(CASE WHEN p.is_correct = true THEN 1 END)::BIGINT as correct_picks,
        COUNT(CASE WHEN p.is_correct = false THEN 1 END)::BIGINT as incorrect_picks,
        COUNT(CASE WHEN p.is_correct IS NULL THEN 1 END)::BIGINT as pending_picks,
        COALESCE(SUM(p.points_earned), 0)::BIGINT as total_points
    FROM picks p
    WHERE p.season = p_season AND p.week_number = p_week
    GROUP BY p.user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_weekly_pick_counts(INTEGER, INTEGER) TO authenticated;

-- Also grant to anon for public access (if needed)
GRANT EXECUTE ON FUNCTION get_weekly_pick_counts(INTEGER, INTEGER) TO anon;
