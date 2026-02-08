-- Run this in Supabase SQL Editor to add random tiebreakers to Super Bowl picks

-- First, temporarily disable the trigger
ALTER TABLE picks DISABLE TRIGGER prevent_locked_pick_updates_trigger;

-- Update Super Bowl picks that don't have a tiebreaker with random values 40-60
UPDATE picks
SET superbowl_total_points_guess = floor(random() * 21 + 40)::int
WHERE week_number = 4
  AND season = 2025
  AND superbowl_total_points_guess IS NULL;

-- Re-enable the trigger
ALTER TABLE picks ENABLE TRIGGER prevent_locked_pick_updates_trigger;

-- Verify the update
SELECT p.id, pr.username, p.superbowl_total_points_guess
FROM picks p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.week_number = 4 AND p.season = 2025
ORDER BY pr.username;
