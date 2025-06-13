
-- Add Row Level Security policy for DELETE operations on loss_reasons table
CREATE POLICY "Enable delete for all users" ON "public"."loss_reasons"
AS PERMISSIVE FOR DELETE
TO public
USING (true);
