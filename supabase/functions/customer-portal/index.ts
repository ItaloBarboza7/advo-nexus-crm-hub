
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("=== CUSTOMER PORTAL SESSION STARTED ===");

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    logStep("Environment validation", {
      supabaseUrlExists: !!supabaseUrl,
      supabaseAnonKeyExists: !!supabaseAnonKey,
      stripeKeyExists: !!stripeKey,
      stripeKeyPrefix: stripeKey?.substring(0, 7)
    });

    if (!supabaseUrl) {
      logStep("FATAL ERROR: SUPABASE_URL missing");
      throw new Error("SUPABASE_URL is not configured");
    }
    if (!supabaseAnonKey) {
      logStep("FATAL ERROR: SUPABASE_ANON_KEY missing");
      throw new Error("SUPABASE_ANON_KEY is not configured");
    }
    if (!stripeKey) {
      logStep("FATAL ERROR: STRIPE_SECRET_KEY missing");
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!stripeKey.startsWith('sk_')) {
      logStep("FATAL ERROR: Invalid Stripe key format", { keyPrefix: stripeKey.substring(0, 3) });
      throw new Error("Invalid STRIPE_SECRET_KEY format - must start with 'sk_'");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    logStep("Supabase client initialized successfully");

    // Extract and validate auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      throw new Error("Authorization header is required");
    }
    if (!authHeader.startsWith("Bearer ")) {
      logStep("ERROR: Invalid authorization header format");
      throw new Error("Invalid authorization header format");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Extracting user from token", { tokenLength: token.length });

    // Authenticate user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("ERROR: User authentication failed", { 
        error: userError.message, 
        code: userError.status 
      });
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: User data incomplete", { 
        hasUser: !!user, 
        hasEmail: !!user?.email 
      });
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated successfully", { 
      userId: user.id, 
      email: user.email,
      emailVerified: user.email_confirmed_at 
    });

    // Initialize Stripe client
    logStep("Initializing Stripe client");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // ENHANCED CUSTOMER SEARCH with multiple strategies
    logStep("=== CUSTOMER SEARCH PHASE ===");
    
    // Strategy 1: Direct email search
    logStep("Strategy 1: Searching by email", { email: user.email });
    let customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 10 
    });
    
    logStep("Email search results", { 
      found: customers.data.length,
      customers: customers.data.map(c => ({ 
        id: c.id, 
        email: c.email, 
        created: c.created 
      }))
    });

    // Strategy 2: If no exact match, try case-insensitive search
    if (customers.data.length === 0) {
      logStep("Strategy 2: Trying case-insensitive search");
      const allCustomers = await stripe.customers.list({ limit: 100 });
      const matchingCustomers = allCustomers.data.filter(c => 
        c.email?.toLowerCase() === user.email.toLowerCase()
      );
      
      logStep("Case-insensitive search results", { 
        totalSearched: allCustomers.data.length,
        matches: matchingCustomers.length,
        matchingCustomers: matchingCustomers.map(c => ({ 
          id: c.id, 
          email: c.email 
        }))
      });
      
      if (matchingCustomers.length > 0) {
        customers = { 
          data: matchingCustomers, 
          has_more: false, 
          object: 'list', 
          url: '' 
        };
      }
    }

    // Strategy 3: If still no customer, create one
    let customerId: string;
    if (customers.data.length === 0) {
      logStep("Strategy 3: Creating new customer", { email: user.email });
      try {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.name || user.email,
          metadata: {
            supabase_user_id: user.id,
            created_by: 'customer-portal-function'
          }
        });
        customerId = newCustomer.id;
        logStep("New customer created successfully", { 
          customerId, 
          email: newCustomer.email 
        });
      } catch (stripeError: any) {
        logStep("ERROR: Failed to create customer", { 
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        });
        throw new Error(`Failed to create Stripe customer: ${stripeError.message}`);
      }
    } else {
      customerId = customers.data[0].id;
      logStep("Using existing customer", { 
        customerId,
        customerEmail: customers.data[0].email,
        customerCreated: customers.data[0].created
      });
    }

    // Determine return URL with enhanced logic
    const requestOrigin = req.headers.get("origin");
    const requestReferer = req.headers.get("referer");
    let returnUrl = "https://8d643525-09c5-4070-808b-e5e82c799712.lovableproject.com";
    
    if (requestOrigin) {
      returnUrl = requestOrigin;
      logStep("Using origin as return URL", { returnUrl });
    } else if (requestReferer) {
      try {
        const refererUrl = new URL(requestReferer);
        returnUrl = refererUrl.origin;
        logStep("Using referer origin as return URL", { returnUrl });
      } catch (e) {
        logStep("WARNING: Invalid referer URL, using default", { 
          referer: requestReferer,
          error: e.message 
        });
      }
    } else {
      logStep("Using default return URL", { returnUrl });
    }

    // Create billing portal session
    logStep("Creating billing portal session", { 
      customerId, 
      returnUrl 
    });
    
    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${returnUrl}/`,
      });
      
      logStep("Portal session created successfully", { 
        sessionId: portalSession.id, 
        url: portalSession.url,
        expires: portalSession.return_url,
        customerId: portalSession.customer
      });
    } catch (stripeError: any) {
      logStep("ERROR: Failed to create portal session", { 
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        customerId,
        returnUrl
      });
      throw new Error(`Failed to create billing portal session: ${stripeError.message}`);
    }

    logStep("=== SUCCESS: RETURNING PORTAL URL ===", { 
      url: portalSession.url 
    });

    return new Response(JSON.stringify({ 
      url: portalSession.url,
      success: true 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    const errorMessage = error?.message ?? String(error);
    const errorStack = error?.stack;
    
    logStep("=== CRITICAL ERROR IN CUSTOMER PORTAL ===", { 
      message: errorMessage,
      stack: errorStack,
      name: error?.name,
      type: typeof error,
      cause: error?.cause,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
      details: "Check function logs for detailed error information",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
