
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for detailed debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-STRIPE-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    logStep("Authorization header found, extracting user");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) {
      logStep("ERROR: User authentication failed", { userError, hasUser: !!user, hasEmail: !!user?.email });
      throw new Error("Usuário não autenticado");
    }

    logStep("User authenticated successfully", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe secret key não configurado");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized");

    // Buscar customer no stripe pelo email
    logStep("Searching for Stripe customer", { email: user.email });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (!customers.data.length) {
      logStep("No Stripe customer found", { email: user.email, totalCustomers: customers.data.length });
      
      // Para novos usuários, isso é normal - não é um erro
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

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId, customerEmail: customers.data[0].email });

    // Buscar assinatura ativa
    logStep("Searching for active subscriptions");
    const subscriptions = await stripe.subscriptions.list({ 
      customer: customerId, 
      status: "active", 
      limit: 1 
    });
    
    if (!subscriptions.data.length) {
      logStep("No active subscription found", { customerId, totalSubscriptions: subscriptions.data.length });
      
      // Verificar se há assinaturas canceladas ou expiradas
      const allSubscriptions = await stripe.subscriptions.list({ 
        customer: customerId, 
        limit: 5 
      });
      
      logStep("All customer subscriptions", { 
        total: allSubscriptions.data.length,
        statuses: allSubscriptions.data.map(sub => ({ id: sub.id, status: sub.status }))
      });
      
      return new Response(JSON.stringify({
        success: true,
        hasSubscription: false,
        message: "Nenhuma assinatura ativa encontrada",
        plan_name: "Nenhum plano ativo",
        amount: 0,
        status: "inactive",
        debug: {
          customerId,
          totalSubscriptions: allSubscriptions.data.length,
          subscriptionStatuses: allSubscriptions.data.map(sub => sub.status)
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const subscription = subscriptions.data[0];
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });

    const item = subscription.items.data[0];
    const plan = item.price;
    logStep("Subscription plan details", { 
      priceId: plan.id, 
      amount: plan.unit_amount, 
      currency: plan.currency,
      nickname: plan.nickname
    });

    // Buscar payment method com fallbacks mais robustos
    let cardBrand = "";
    let cardLast4 = "";
    let cardExpMonth = "";
    let cardExpYear = "";

    try {
      let paymentMethodId = null;
      
      // Tentar obter payment method da assinatura primeiro
      if (subscription.default_payment_method) {
        paymentMethodId = subscription.default_payment_method as string;
        logStep("Using subscription payment method", { paymentMethodId });
      } 
      // Fallback para payment method do customer
      else if (customers.data[0].invoice_settings?.default_payment_method) {
        paymentMethodId = customers.data[0].invoice_settings.default_payment_method as string;
        logStep("Using customer default payment method", { paymentMethodId });
      }
      // Último fallback: buscar payment methods anexados ao customer
      else {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
          limit: 1,
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
          logStep("Payment method details retrieved", { cardBrand, cardLast4 });
        }
      } else {
        logStep("No payment method found for customer");
      }
    } catch (pmError) {
      logStep("Error retrieving payment method", { error: pmError });
      // Não falhar a requisição por erro de payment method
    }

    const responseData = {
      success: true,
      hasSubscription: true,
      plan_name: plan.nickname || `Plano ${plan.unit_amount ? (plan.unit_amount/100).toFixed(2) : 'Desconhecido'}`,
      amount: plan.unit_amount || 0,
      card_brand: cardBrand,
      card_last4: cardLast4,
      exp_month: cardExpMonth,
      exp_year: cardExpYear,
      status: subscription.status,
      subscription_id: subscription.id,
      current_period_end: subscription.current_period_end
    };

    logStep("Sending successful response", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStep("ERROR in get-stripe-details", { message: errorMessage, stack: err instanceof Error ? err.stack : undefined });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      hasSubscription: false,
      plan_name: "Erro ao carregar",
      amount: 0,
      status: "error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
