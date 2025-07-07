
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment variables first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    logStep("Environment check", {
      supabaseUrlExists: !!supabaseUrl,
      supabaseAnonKeyExists: !!supabaseAnonKey,
      stripeKeyExists: !!stripeKey,
      stripeKeyPrefix: stripeKey?.substring(0, 7)
    });

    if (!supabaseUrl) {
      logStep("ERROR: SUPABASE_URL is not set");
      throw new Error("SUPABASE_URL is not set");
    }
    if (!supabaseAnonKey) {
      logStep("ERROR: SUPABASE_ANON_KEY is not set");
      throw new Error("SUPABASE_ANON_KEY is not set");
    }
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY is not set");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    if (!stripeKey.startsWith('sk_')) {
      logStep("ERROR: Invalid STRIPE_SECRET_KEY format", { keyPrefix: stripeKey.substring(0, 3) });
      throw new Error("Invalid STRIPE_SECRET_KEY format");
    }

    // Initialize Supabase client with anon key for auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    logStep("Supabase client initialized");

    // Validate and extract auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      throw new Error("No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      logStep("ERROR: Invalid authorization header format");
      throw new Error("Invalid authorization header format");
    }
    logStep("Authorization header found");

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token", { tokenLength: token.length });
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("ERROR: Authentication error", { error: userError });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or email not available");
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe client
    logStep("Initializing Stripe client");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find the Stripe customer by email
    logStep("Searching for Stripe customer", { email: user.email });
    let customers;
    try {
      customers = await stripe.customers.list({ email: user.email, limit: 10 });
      logStep("Customer search completed", { 
        customersFound: customers.data.length,
        customers: customers.data.map(c => ({ id: c.id, email: c.email }))
      });
    } catch (stripeError: any) {
      logStep("ERROR: Stripe customer search failed", { 
        error: stripeError.message, 
        type: stripeError.type,
        code: stripeError.code
      });
      throw new Error(`Stripe customer search failed: ${stripeError.message}`);
    }
    
    if (customers.data.length === 0) {
      logStep("ERROR: No Stripe customer found", { email: user.email });
      throw new Error("No Stripe customer found for this user");
    }
    
    const stripeCustomer = customers.data[0];
    const stripeCustomerId = stripeCustomer.id;
    logStep("Found Stripe customer", { 
      stripeCustomerId,
      customerEmail: stripeCustomer.email,
      customerCreated: stripeCustomer.created
    });

    // Determine return URL more robustly
    const requestOrigin = req.headers.get("origin");
    const requestReferer = req.headers.get("referer");
    let returnUrl = "https://8d643525-09c5-4070-808b-e5e82c799712.lovableproject.com";
    
    if (requestOrigin) {
      returnUrl = requestOrigin;
    } else if (requestReferer) {
      try {
        const refererUrl = new URL(requestReferer);
        returnUrl = refererUrl.origin;
      } catch (e) {
        logStep("WARNING: Invalid referer URL", { referer: requestReferer });
      }
    }
    
    logStep("Determined return URL", { 
      returnUrl, 
      requestOrigin, 
      requestReferer: requestReferer?.substring(0, 100) 
    });

    // Create billing portal session with enhanced error handling
    logStep("Creating billing portal session");
    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${returnUrl}/`,
      });
      logStep("Customer portal session created successfully", { 
        sessionId: portalSession.id, 
        url: portalSession.url,
        created: portalSession.created,
        returnUrl: portalSession.return_url
      });
    } catch (stripeError: any) {
      logStep("ERROR: Failed to create billing portal session", { 
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        customerId: stripeCustomerId,
        returnUrl
      });
      throw new Error(`Failed to create billing portal session: ${stripeError.message}`);
    }

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    logStep("ERROR in customer-portal", { 
      message: e?.message ?? String(e), 
      stack: e?.stack,
      name: e?.name,
      type: typeof e,
      cause: e?.cause
    });
    
    return new Response(JSON.stringify({ 
      error: e?.message ?? String(e),
      details: "Verifique os logs da função para mais detalhes"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
