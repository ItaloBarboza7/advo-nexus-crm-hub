
CREATE POLICY "Allow insert for all users"
  ON public.kanban_columns
  FOR INSERT
  WITH CHECK (true);
