
-- First, add the user_id column to the user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to associate them with the first user (temporary solution)
-- This is necessary to not break existing data
UPDATE public.user_profiles 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make the user_id column required
ALTER TABLE public.user_profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Now clean up any duplicates that might exist after adding user_id
-- Keep only the most recent profile for each user_id
DELETE FROM public.user_profiles 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.user_profiles 
    ORDER BY user_id, created_at DESC
);

-- Create unique index to ensure one profile per user
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_idx 
ON public.user_profiles(user_id);

-- Enable RLS on the table user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to view only their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert only their own profile
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update only their own profile
CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for users to delete only their own profile
CREATE POLICY "Users can delete own profile" 
ON public.user_profiles 
FOR DELETE 
USING (auth.uid() = user_id);
