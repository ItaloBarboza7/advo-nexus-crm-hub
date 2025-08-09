
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("=== CHECK SUBSCRIPTION STARTED ===");

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !stripeKey) {
      throw new Error("Missing required environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User authentication failed");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get effective user ID and email (admin for members)
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('parent_user_id, email')
      .eq('user_id', user.id)
      .single();

    const effectiveUserId = userProfile?.parent_user_id || user.id;
    const isMember = !!userProfile?.parent_user_id;

    logStep("Effective user determined", { 
      effectiveUserId, 
      isMember,
      originalUserId: user.id 
    });

    // Get effective user email for Stripe search
    let effectiveUserEmail = user.email;
    if (isMember && userProfile?.parent_user_id) {
      const { data: adminProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('user_id', userProfile.parent_user_id)
        .single();
      
      if (adminProfile?.email) {
        effectiveUserEmail = adminProfile.email;
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized");

    // Search for customer in Stripe using effective user email
    logStep("Searching for Stripe customer", { effectiveUserEmail });

    let stripeCustomer = null;
    let hasActiveSubscription = false;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    try {
      // Search by email
      const customers = await stripe.customers.list({ 
        email: effectiveUserEmail, 
        limit: 10 
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
        logStep("Customer found", { customerId: stripeCustomer.id });

        // Check for active AND trial subscriptions (including canceled ones still in period)
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          limit: 10
        });

        // Find the best subscription (active, trialing, or canceled but still in period)
        let bestSubscription = null;
        for (const sub of subscriptions.data) {
          const periodEnd = new Date(sub.current_period_end * 1000);
          const now = new Date();
          
          logStep("Checking subscription", {
            subscriptionId: sub.id,
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: periodEnd,
            isInActivePeriod: periodEnd > now
          });

          // Consider subscription active if:
          // 1. Status is 'active' or 'trialing'
          // 2. OR if it's canceled but still in the paid period
          if (sub.status === 'active' || sub.status === 'trialing' || 
             (sub.status === 'canceled' && periodEnd > now)) {
            bestSubscription = sub;
            break;
          }
        }

        if (bestSubscription) {
          hasActiveSubscription = true;
          subscriptionEnd = new Date(bestSubscription.current_period_end * 1000);
          
          const plan = bestSubscription.items.data[0]?.price;
          if (plan?.unit_amount === 15700) {
            subscriptionTier = "CRM Profissional - Mensal";
          } else if (plan?.unit_amount === 9900) {
            subscriptionTier = "CRM Profissional - Anual";
          } else {
            subscriptionTier = "Plano Personalizado";
          }

          logStep("Active subscription found", {
            subscriptionId: bestSubscription.id,
            status: bestSubscription.status,
            cancelAtPeriodEnd: bestSubscription.cancel_at_period_end,
            tier: subscriptionTier,
            periodEnd: subscriptionEnd
          });
        } else {
          logStep("No active subscriptions found");
        }
      } else {
        logStep("No customer found with email");
      }
    } catch (stripeError) {
      logStep("Stripe search failed", { error: stripeError });
    }

    // Update subscribers table using EFFECTIVE user ID (always admin)
    const subscriberData = {
      user_id: effectiveUserId,
      email: effectiveUserEmail,
      stripe_customer_id: stripeCustomer?.id || null,
      subscribed: hasActiveSubscription,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      last_checked: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabaseAdmin
      .from('subscribers')
      .upsert(subscriberData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      logStep("Failed to update subscribers table", { error: upsertError });
      throw new Error("Failed to update subscription status");
    }

    // Clean up any stale member-specific records if this is a member
    if (isMember) {
      logStep("Cleaning up stale member records", { memberId: user.id });
      const { error: cleanupError } = await supabaseAdmin
        .from('subscribers')
        .delete()
        .eq('user_id', user.id);
      
      if (cleanupError && !cleanupError.message.includes('No rows')) {
        logStep("Warning: Failed to cleanup member records", { error: cleanupError });
      }
    }

    logStep("Subscription status updated successfully", subscriberData);

    return new Response(JSON.stringify({
      success: true,
      subscribed: hasActiveSubscription,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      is_member: isMember,
      effective_user_id: effectiveUserId,
      last_checked: subscriberData.last_checked
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error?.message ?? String(error);
    logStep("=== ERROR IN CHECK-SUBSCRIPTION ===", { 
      message: errorMessage,
      stack: error?.stack 
    });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
