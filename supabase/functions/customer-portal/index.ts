
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

// Função para encontrar o melhor cliente baseado em critérios (copied from get-stripe-details)
const findBestCustomer = async (stripe: Stripe, candidates: any[], userId: string): Promise<any | null> => {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  logStep("Multiple customers found, evaluating best match", {
    totalCandidates: candidates.length,
    candidates: candidates.map(c => ({
      id: c.id,
      email: c.email,
      created: c.created,
      metadata: c.metadata
    }))
  });
  
  const evaluatedCustomers = [];
  
  for (const customer of candidates) {
    let score = 0;
    
    // +100 pontos se tem o supabase_user_id correto
    if (customer.metadata?.supabase_user_id === userId) {
      score += 100;
    }
    
    // Verificar assinaturas ativas
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10
      });
      
      // +50 pontos por assinatura ativa
      score += subscriptions.data.length * 50;
      
      // +25 pontos se tem assinatura trialing
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 10
      });
      score += trialingSubscriptions.data.length * 25;
      
    } catch (error) {
      logStep("Error checking subscriptions for customer", {
        customerId: customer.id,
        error
      });
    }
    
    // +10 pontos se foi atualizado recentemente (metadados)
    if (customer.metadata?.email_updated_at) {
      const updateTime = new Date(customer.metadata.email_updated_at).getTime();
      const daysSinceUpdate = (Date.now() - updateTime) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        score += 10;
      }
    }
    
    // +5 pontos se foi consolidado (indica que já passou pelo processo)
    if (customer.metadata?.consolidated_duplicates === 'true') {
      score += 5;
    }
    
    evaluatedCustomers.push({
      customer,
      score,
      details: {
        hasMatchingUserId: customer.metadata?.supabase_user_id === userId,
        hasRecentUpdate: !!customer.metadata?.email_updated_at,
        wasConsolidated: customer.metadata?.consolidated_duplicates === 'true'
      }
    });
  }
  
  // Ordenar por pontuação (maior primeiro)
  evaluatedCustomers.sort((a, b) => b.score - a.score);
  
  const bestCustomer = evaluatedCustomers[0];
  
  logStep("Best customer selected", {
    customerId: bestCustomer.customer.id,
    email: bestCustomer.customer.email,
    score: bestCustomer.score,
    details: bestCustomer.details,
    allScores: evaluatedCustomers.map(ec => ({
      id: ec.customer.id,
      score: ec.score,
      details: ec.details
    }))
  });
  
  return bestCustomer.customer;
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

    // COMPREHENSIVE CUSTOMER SEARCH with multiple strategies (same as get-stripe-details)
    logStep("=== CUSTOMER SEARCH PHASE ===");
    
    const allFoundCustomers = new Map<string, any>();
    
    // Strategy 1: Direct email search
    logStep("Strategy 1: Searching by exact email", { email: user.email });
    try {
      const customers = await stripe.customers.list({ 
        email: user.email, 
        limit: 10 
      });
      
      logStep("Exact email search results", { 
        found: customers.data.length,
        customers: customers.data.map(c => ({ 
          id: c.id, 
          email: c.email, 
          created: c.created,
          metadata: c.metadata 
        }))
      });
      
      customers.data.forEach(customer => {
        allFoundCustomers.set(customer.id, customer);
      });
    } catch (error) {
      logStep("Strategy 1 failed", { error });
    }

    // Strategy 2: Search by Supabase user ID in metadata
    logStep("Strategy 2: Searching by Supabase user ID in metadata");
    try {
      const allRecentCustomers = await stripe.customers.list({ 
        limit: 100,
        created: { gte: Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60) } // Last 180 days
      });
      
      const matchingByUserId = allRecentCustomers.data.filter(c => 
        c.metadata?.supabase_user_id === user.id
      );
      
      logStep("User ID metadata search results", { 
        totalSearched: allRecentCustomers.data.length,
        matches: matchingByUserId.length,
        matchingCustomers: matchingByUserId.map(c => ({ 
          id: c.id, 
          email: c.email,
          metadata: c.metadata 
        }))
      });
      
      matchingByUserId.forEach(customer => {
        allFoundCustomers.set(customer.id, customer);
      });
    } catch (error) {
      logStep("Strategy 2 failed", { error });
    }

    // Strategy 3: Search by previous email in metadata
    logStep("Strategy 3: Searching by previous_email in metadata");
    try {
      const allCustomers = await stripe.customers.list({ limit: 100 });
      const matchingByPreviousEmail = allCustomers.data.filter(c => 
        c.metadata?.previous_email?.toLowerCase() === user.email.toLowerCase() ||
        c.email?.toLowerCase() !== user.email.toLowerCase() && 
        c.metadata?.supabase_user_id === user.id
      );
      
      logStep("Previous email metadata search results", { 
        matches: matchingByPreviousEmail.length,
        matchingCustomers: matchingByPreviousEmail.map(c => ({ 
          id: c.id, 
          email: c.email,
          previousEmail: c.metadata?.previous_email,
          metadata: c.metadata 
        }))
      });
      
      matchingByPreviousEmail.forEach(customer => {
        allFoundCustomers.set(customer.id, customer);
      });
    } catch (error) {
      logStep("Strategy 3 failed", { error });
    }

    // Strategy 4: Case-insensitive email search
    if (allFoundCustomers.size === 0) {
      logStep("Strategy 4: Case-insensitive email search");
      try {
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
        
        matchingCustomers.forEach(customer => {
          allFoundCustomers.set(customer.id, customer);
        });
      } catch (error) {
        logStep("Strategy 4 failed", { error });
      }
    }

    const candidateCustomers = Array.from(allFoundCustomers.values());
    
    logStep("All search strategies completed", {
      totalUniqueCandidates: candidateCustomers.length,
      candidateIds: candidateCustomers.map(c => c.id)
    });

    // If no customers found, create a new one
    let customerId: string;
    if (candidateCustomers.length === 0) {
      logStep("No customers found, creating new customer", { email: user.email });
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
      // Find the best customer using the same logic as get-stripe-details
      const bestCustomer = await findBestCustomer(stripe, candidateCustomers, user.id);
      if (!bestCustomer) {
        throw new Error("Failed to determine the best customer");
      }
      customerId = bestCustomer.id;
      logStep("Using best customer selected", { 
        customerId,
        customerEmail: bestCustomer.email,
        customerCreated: bestCustomer.created,
        customerMetadata: bestCustomer.metadata
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
