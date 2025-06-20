
-- Enable real-time for company_info table
ALTER TABLE public.company_info REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_info;

-- Enable real-time for user_profiles table  
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
