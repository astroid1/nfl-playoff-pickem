-- Fix prevent_locked_pick_updates to allow scoring updates
-- We only want to block changes to the user's selection (team or tiebreaker)

CREATE OR REPLACE FUNCTION prevent_locked_pick_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if game is locked
  IF EXISTS (
    SELECT 1 FROM games
    WHERE id = NEW.game_id
    AND is_locked = TRUE
  ) THEN
    -- If it's an INSERT, usually block it (can't make new picks for locked games)
    -- Unless the system is doing something weird, but typically users create picks.
    IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'Cannot modify pick for locked game';
    END IF;

    -- If it's an UPDATE, only block if the user's SELECTION changes.
    -- We want to allow the system to update 'is_correct' and 'points_earned'.
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.selected_team_id IS DISTINCT FROM OLD.selected_team_id) OR
           (NEW.superbowl_total_points_guess IS DISTINCT FROM OLD.superbowl_total_points_guess) THEN
            RAISE EXCEPTION 'Cannot modify pick for locked game';
        END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
