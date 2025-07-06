
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

    logStep("User authenticated successfully", { userId: user.id, email: user.email, metadata: user.user_metadata });

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
      
      // Check if user has plan info in metadata (newly created user)
      const userPlanType = user.user_metadata?.plan_type;
      const isPaymentConfirmed = user.user_metadata?.payment_confirmed;
      
      logStep("Checking user metadata for plan info", { userPlanType, isPaymentConfirmed });
      
      if (userPlanType && isPaymentConfirmed) {
        // User was recently created after payment but Stripe customer not found yet
        // This might be a timing issue - return pending state
        return new Response(JSON.stringify({
          success: true,
          hasSubscription: false,
          isPending: true,
          message: "Processando assinatura, aguarde alguns instantes...",
          plan_name: userPlanType === 'monthly' ? "Plano Mensal (Processando)" : "Plano Anual (Processando)",
          amount: userPlanType === 'monthly' ? 15700 : 9900,
          status: "processing"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // For users without any plan info
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

    // Buscar todas as assinaturas (não apenas ativas) para melhor diagnóstico
    logStep("Searching for all subscriptions");
    const allSubscriptions = await stripe.subscriptions.list({ 
      customer: customerId, 
      limit: 10 
    });
    
    logStep("All customer subscriptions", { 
      total: allSubscriptions.data.length,
      statuses: allSubscriptions.data.map(sub => ({ 
        id: sub.id, 
        status: sub.status,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end
      }))
    });

    // Buscar assinatura ativa primeiro
    const activeSubscriptions = allSubscriptions.data.filter(sub => sub.status === "active");
    
    if (activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0];
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

      // Buscar payment method
      let cardBrand = "";
      let cardLast4 = "";
      let cardExpMonth = "";
      let cardExpYear = "";

      try {
        let paymentMethodId = null;
        
        if (subscription.default_payment_method) {
          paymentMethodId = subscription.default_payment_method as string;
          logStep("Using subscription payment method", { paymentMethodId });
        } 
        else if (customers.data[0].invoice_settings?.default_payment_method) {
          paymentMethodId = customers.data[0].invoice_settings.default_payment_method as string;
          logStep("Using customer default payment method", { paymentMethodId });
        }
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
        status: subscription.status,
        subscription_id: subscription.id,
        current_period_end: subscription.current_period_end
      };

      logStep("Sending successful response", responseData);

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se não há assinatura ativa, verificar outras possibilidades
    const paidSubscriptions = allSubscriptions.data.filter(sub => 
      sub.status === "trialing" || 
      sub.status === "past_due" || 
      (sub.status === "canceled" && sub.cancel_at_period_end && new Date(sub.current_period_end * 1000) > new Date())
    );

    if (paidSubscriptions.length > 0) {
      const subscription = paidSubscriptions[0];
      logStep("Found paid/trialing subscription", { subscriptionId: subscription.id, status: subscription.status });
      
      const item = subscription.items.data[0];
      const plan = item.price;
      
      return new Response(JSON.stringify({
        success: true,
        hasSubscription: true,
        plan_name: getPlanName(plan.unit_amount || 0, plan.nickname),
        amount: plan.unit_amount || 0,
        status: subscription.status,
        subscription_id: subscription.id,
        current_period_end: subscription.current_period_end
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verificar assinaturas incompletas apenas como último recurso
    const incompleteSubscriptions = allSubscriptions.data.filter(sub => sub.status === "incomplete");
    
    if (incompleteSubscriptions.length > 0) {
      const subscription = incompleteSubscriptions[0];
      logStep("Found incomplete subscription", { subscriptionId: subscription.id });
      
      const item = subscription.items.data[0];
      const plan = item.price;
      
      return new Response(JSON.stringify({
        success: true,
        hasSubscription: false,
        isPending: true,
        message: "Pagamento sendo processado...",
        plan_name: getPlanName(plan.unit_amount || 0, plan.nickname),
        amount: plan.unit_amount || 0,
        status: "processing",
        subscription_id: subscription.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("No subscription found");
    
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

// Helper function to determine plan name based on amount and nickname
function getPlanName(amount: number, nickname?: string | null): string {
  if (nickname) return nickname;
  
  if (amount === 15700) return "CRM Profissional - Mensal";
  if (amount === 9900) return "CRM Profissional - Anual";
  
  return `Plano ${amount ? (amount/100).toFixed(2) : 'Desconhecido'}`;
}
