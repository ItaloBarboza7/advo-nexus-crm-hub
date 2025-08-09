
-- Create subscribers table to store subscription status locally
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own subscription info
CREATE POLICY "Users can view own subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid());

-- Policy for members to view their admin's subscription
CREATE POLICY "Members can view admin subscription" ON public.subscribers
FOR SELECT
USING (
  user_id = COALESCE(
    (SELECT parent_user_id FROM public.user_profiles WHERE user_id = auth.uid()),
    auth.uid()
  )
);

-- Policy for edge functions to insert/update subscription info
CREATE POLICY "Service can manage subscriptions" ON public.subscribers
FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
