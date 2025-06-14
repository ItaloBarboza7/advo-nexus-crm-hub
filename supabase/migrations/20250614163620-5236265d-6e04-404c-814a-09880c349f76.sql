
-- Fix existing kanban_columns so order_position is always sequential (1, 2, 3, ...)
DO $$
DECLARE
  _row RECORD;
  _idx INT := 1;
BEGIN
  FOR _row IN
    SELECT id FROM public.kanban_columns ORDER BY order_position ASC, created_at ASC
  LOOP
    UPDATE public.kanban_columns SET order_position = _idx WHERE id = _row.id;
    _idx := _idx + 1;
  END LOOP;
END$$;

-- Optional: Make sure future inserts don't allow weird order values (handled by app, so this is just for cleanliness)
-- No CHECK constraint added here, as validated by app logic.

-- No table structure changes needed

