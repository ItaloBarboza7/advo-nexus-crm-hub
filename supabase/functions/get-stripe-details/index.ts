
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced logging function for detailed debugging
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [GET-STRIPE-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("=== STRIPE DETAILS DIAGNOSTIC STARTED ===");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    logStep("Extracting user from token");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) {
      logStep("ERROR: User authentication failed", { userError, hasUser: !!user, hasEmail: !!user?.email });
      throw new Error("Usuário não autenticado");
    }

    logStep("User authenticated successfully", { 
      userId: user.id, 
      email: user.email, 
      metadata: user.user_metadata,
      emailVerified: user.email_confirmed_at 
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe secret key não configurado");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized successfully");

    // ENHANCED CUSTOMER SEARCH - Multiple strategies
    logStep("=== CUSTOMER SEARCH PHASE ===");
    
    // Strategy 1: Exact email match
    logStep("Strategy 1: Searching by exact email", { email: user.email });
    let customers = await stripe.customers.list({ email: user.email, limit: 10 });
    logStep("Exact email search results", { 
      found: customers.data.length,
      customers: customers.data.map(c => ({ id: c.id, email: c.email, created: c.created }))
    });

    // Strategy 2: If no exact match, search all customers and filter (for edge cases)
    if (customers.data.length === 0) {
      logStep("Strategy 2: Searching all recent customers");
      const allRecentCustomers = await stripe.customers.list({ limit: 100 });
      const matchingCustomers = allRecentCustomers.data.filter(c => 
        c.email?.toLowerCase() === user.email.toLowerCase()
      );
      logStep("Fuzzy search results", { 
        totalSearched: allRecentCustomers.data.length,
        matches: matchingCustomers.length,
        matchingCustomers: matchingCustomers.map(c => ({ id: c.id, email: c.email }))
      });
      
      if (matchingCustomers.length > 0) {
        customers = { data: matchingCustomers, has_more: false, object: 'list', url: '' };
      }
    }

    // If no customer found, check user metadata for recent payment
    if (customers.data.length === 0) {
      logStep("=== NO CUSTOMER FOUND - CHECKING USER METADATA ===");
      
      const userPlanType = user.user_metadata?.plan_type;
      const isPaymentConfirmed = user.user_metadata?.payment_confirmed;
      const subscriptionCreatedAt = user.user_metadata?.subscription_created_at;
      const stripeSessionId = user.user_metadata?.stripe_session_id;
      
      logStep("User metadata analysis", { 
        userPlanType, 
        isPaymentConfirmed, 
        subscriptionCreatedAt,
        stripeSessionId
      });
      
      if (userPlanType && isPaymentConfirmed) {
        // Check if this is a very recent payment (within last hour)
        const isRecentPayment = subscriptionCreatedAt && 
          (new Date().getTime() - new Date(subscriptionCreatedAt).getTime()) < 3600000; // 1 hour
        
        logStep("Recent payment analysis", { 
          isRecentPayment,
          timeSincePayment: subscriptionCreatedAt ? 
            `${Math.round((new Date().getTime() - new Date(subscriptionCreatedAt).getTime()) / 60000)} minutes` : 
            'unknown'
        });

        // ENHANCED RECOVERY: Try to find the customer by session ID or other means
        if (stripeSessionId) {
          try {
            logStep("Attempting recovery via Stripe session ID", { stripeSessionId });
            const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
            logStep("Session retrieved", { 
              sessionId: session.id,
              customerId: session.customer,
              paymentStatus: session.payment_status,
              subscriptionId: session.subscription
            });

            if (session.customer) {
              const recoveredCustomer = await stripe.customers.retrieve(session.customer as string);
              logStep("Customer recovered via session", { 
                customerId: recoveredCustomer.id,
                email: (recoveredCustomer as any).email 
              });
              
              customers = { 
                data: [recoveredCustomer as any], 
                has_more: false, 
                object: 'list', 
                url: '' 
              };
            }
          } catch (sessionError) {
            logStep("Session recovery failed", { error: sessionError });
          }
        }

        // If still no customer but payment confirmed, return processing state
        if (customers.data.length === 0) {
          logStep("Payment confirmed but no customer found - returning processing state");
          return new Response(JSON.stringify({
            success: true,
            hasSubscription: false,
            isPending: true,
            message: "Processando assinatura, aguarde alguns instantes...",
            plan_name: userPlanType === 'monthly' ? "Plano Mensal (Processando)" : "Plano Anual (Processando)",
            amount: userPlanType === 'monthly' ? 15700 : 9900,
            status: "processing",
            debug: {
              reason: "payment_confirmed_no_customer",
              userPlanType,
              isPaymentConfirmed,
              subscriptionCreatedAt
            }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } else {
        // No payment confirmation in metadata
        logStep("No payment confirmation found in user metadata");
        return new Response(JSON.stringify({
          success: true,
          hasSubscription: false,
          message: "Usuário ainda não possui assinatura ativa",
          plan_name: "Nenhum plano ativo",
          amount: 0,
          status: "inactive"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const customerId = customers.data[0].id;
    logStep("=== CUSTOMER FOUND - ANALYZING SUBSCRIPTIONS ===", { 
      customerId, 
      customerEmail: customers.data[0].email,
      customerCreated: customers.data[0].created
    });

    // COMPREHENSIVE SUBSCRIPTION SEARCH
    logStep("Fetching ALL subscriptions for customer");
    const allSubscriptions = await stripe.subscriptions.list({ 
      customer: customerId, 
      limit: 20 // Increased limit
    });
    
    logStep("All subscriptions analysis", { 
      total: allSubscriptions.data.length,
      subscriptions: allSubscriptions.data.map(sub => ({ 
        id: sub.id, 
        status: sub.status,
        current_period_end: sub.current_period_end,
        current_period_start: sub.current_period_start,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,
        created: sub.created,
        priceId: sub.items.data[0]?.price?.id,
        amount: sub.items.data[0]?.price?.unit_amount
      }))
    });

    // ENHANCED SUBSCRIPTION STATUS DETECTION
    const activeSubscriptions = allSubscriptions.data.filter(sub => sub.status === "active");
    const trialingSubscriptions = allSubscriptions.data.filter(sub => sub.status === "trialing");
    const pastDueSubscriptions = allSubscriptions.data.filter(sub => sub.status === "past_due");
    const canceledButActiveSubscriptions = allSubscriptions.data.filter(sub => 
      sub.status === "canceled" && 
      sub.cancel_at_period_end && 
      new Date(sub.current_period_end * 1000) > new Date()
    );
    const incompleteSubscriptions = allSubscriptions.data.filter(sub => sub.status === "incomplete");
    const incompleteExpiredSubscriptions = allSubscriptions.data.filter(sub => sub.status === "incomplete_expired");

    logStep("Subscription categorization", {
      active: activeSubscriptions.length,
      trialing: trialingSubscriptions.length,
      pastDue: pastDueSubscriptions.length,
      canceledButActive: canceledButActiveSubscriptions.length,
      incomplete: incompleteSubscriptions.length,
      incompleteExpired: incompleteExpiredSubscriptions.length
    });

    // Priority order: active > trialing > past_due > canceled_but_active
    let selectedSubscription = null;
    let subscriptionCategory = "";

    if (activeSubscriptions.length > 0) {
      selectedSubscription = activeSubscriptions[0];
      subscriptionCategory = "active";
    } else if (trialingSubscriptions.length > 0) {
      selectedSubscription = trialingSubscriptions[0];
      subscriptionCategory = "trialing";
    } else if (pastDueSubscriptions.length > 0) {
      selectedSubscription = pastDueSubscriptions[0];
      subscriptionCategory = "past_due";
    } else if (canceledButActiveSubscriptions.length > 0) {
      selectedSubscription = canceledButActiveSubscriptions[0];
      subscriptionCategory = "canceled_but_active";
    }

    if (selectedSubscription) {
      logStep("=== ACTIVE/VALID SUBSCRIPTION FOUND ===", { 
        subscriptionId: selectedSubscription.id, 
        status: selectedSubscription.status,
        category: subscriptionCategory,
        currentPeriodEnd: selectedSubscription.current_period_end,
        currentPeriodStart: selectedSubscription.current_period_start
      });

      const item = selectedSubscription.items.data[0];
      const plan = item.price;
      logStep("Subscription plan details", { 
        priceId: plan.id, 
        amount: plan.unit_amount, 
        currency: plan.currency,
        nickname: plan.nickname,
        interval: plan.recurring?.interval
      });

      // ENHANCED PAYMENT METHOD RETRIEVAL
      let cardBrand = "";
      let cardLast4 = "";
      let cardExpMonth = "";
      let cardExpYear = "";

      try {
        logStep("=== PAYMENT METHOD RETRIEVAL ===");
        let paymentMethodId = null;
        
        // Multiple strategies to find payment method
        if (selectedSubscription.default_payment_method) {
          paymentMethodId = selectedSubscription.default_payment_method as string;
          logStep("Using subscription default payment method", { paymentMethodId });
        } 
        else if (customers.data[0].invoice_settings?.default_payment_method) {
          paymentMethodId = customers.data[0].invoice_settings.default_payment_method as string;
          logStep("Using customer default payment method", { paymentMethodId });
        }
        else {
          logStep("Searching for attached payment methods");
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
            limit: 5,
          });
          
          logStep("Found payment methods", { 
            count: paymentMethods.data.length,
            methods: paymentMethods.data.map(pm => ({ id: pm.id, type: pm.type, created: pm.created }))
          });
          
          if (paymentMethods.data.length > 0) {
            paymentMethodId = paymentMethods.data[0].id;
            logStep("Using first attached payment method", { paymentMethodId });
          }
        }

        if (paymentMethodId) {
          const pmethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          if (pmethod && pmethod.type === "card" && pmethod.card) {
            cardBrand = pmethod.card.brand;
            cardLast4 = pmethod.card.last4;
            cardExpMonth = pmethod.card.exp_month.toString();
            cardExpYear = pmethod.card.exp_year.toString();
            logStep("Payment method details retrieved", { cardBrand, cardLast4, expMonth: cardExpMonth, expYear: cardExpYear });
          }
        } else {
          logStep("No payment method found for customer");
        }
      } catch (pmError) {
        logStep("Error retrieving payment method", { error: pmError });
      }

      const responseData = {
        success: true,
        hasSubscription: true,
        plan_name: getPlanName(plan.unit_amount || 0, plan.nickname),
        amount: plan.unit_amount || 0,
        card_brand: cardBrand,
        card_last4: cardLast4,
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        status: selectedSubscription.status,
        subscription_id: selectedSubscription.id,
        current_period_end: selectedSubscription.current_period_end,
        debug: {
          subscriptionCategory,
          customerId,
          totalSubscriptionsFound: allSubscriptions.data.length,
          searchStrategiesUsed: customers.data.length > 0 ? ["exact_email"] : ["session_recovery"]
        }
      };

      logStep("=== SUCCESS RESPONSE PREPARED ===", responseData);

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // HANDLE INCOMPLETE SUBSCRIPTIONS
    if (incompleteSubscriptions.length > 0) {
      const incompleteSubscription = incompleteSubscriptions[0];
      logStep("=== INCOMPLETE SUBSCRIPTION FOUND ===", { 
        subscriptionId: incompleteSubscription.id,
        status: incompleteSubscription.status,
        latestInvoice: incompleteSubscription.latest_invoice
      });
      
      // Try to get more details about why it's incomplete
      if (incompleteSubscription.latest_invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(incompleteSubscription.latest_invoice as string);
          logStep("Latest invoice details", {
            invoiceId: invoice.id,
            status: invoice.status,
            paymentIntent: invoice.payment_intent,
            amountPaid: invoice.amount_paid,
            amountDue: invoice.amount_due
          });
        } catch (invoiceError) {
          logStep("Error retrieving invoice details", { error: invoiceError });
        }
      }
      
      const item = incompleteSubscription.items.data[0];
      const plan = item.price;
      
      return new Response(JSON.stringify({
        success: true,
        hasSubscription: false,
        isPending: true,
        message: "Pagamento sendo processado...",
        plan_name: getPlanName(plan.unit_amount || 0, plan.nickname),
        amount: plan.unit_amount || 0,
        status: "processing",
        subscription_id: incompleteSubscription.id,
        debug: {
          reason: "incomplete_subscription",
          subscriptionId: incompleteSubscription.id,
          customerId
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // FINAL FALLBACK - NO VALID SUBSCRIPTIONS FOUND
    logStep("=== NO VALID SUBSCRIPTIONS FOUND ===");
    
    return new Response(JSON.stringify({
      success: true,
      hasSubscription: false,
      message: "Nenhuma assinatura ativa encontrada",
      plan_name: "Nenhum plano ativo",
      amount: 0,
      status: "inactive",
      debug: {
        reason: "no_valid_subscriptions",
        customerId,
        totalSubscriptions: allSubscriptions.data.length,
        subscriptionStatuses: allSubscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          created: sub.created
        }))
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    logStep("=== CRITICAL ERROR ===", { 
      message: errorMessage, 
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      hasSubscription: false,
      plan_name: "Erro ao carregar",
      amount: 0,
      status: "error",
      debug: {
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Helper function to determine plan name based on amount and nickname
function getPlanName(amount: number, nickname?: string | null): string {
  if (nickname) return nickname;
  
  if (amount === 15700) return "CRM Profissional - Mensal";
  if (amount === 9900) return "CRM Profissional - Anual";
  
  return `Plano ${amount ? (amount/100).toFixed(2) : 'Desconhecido'}`;
}
