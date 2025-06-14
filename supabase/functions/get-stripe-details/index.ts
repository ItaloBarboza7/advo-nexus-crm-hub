
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) throw new Error("Usuário não autenticado");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    // Buscar customer no stripe pelo email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) throw new Error("Cliente não encontrado no Stripe");

    const customerId = customers.data[0].id;

    // Buscar assinatura ativa
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (!subscriptions.data.length) throw new Error("Nenhuma assinatura ativa encontrada");
    const subscription = subscriptions.data[0];

    const item = subscription.items.data[0];
    const plan = item.price;

    // Buscar payment method
    let cardBrand = "";
    let cardLast4 = "";
    let cardExpMonth = "";
    let cardExpYear = "";

    if (subscription.default_payment_method) {
      // payment method attached to subscription
      const pmethod = await stripe.paymentMethods.retrieve(subscription.default_payment_method as string);
      if (pmethod && pmethod.type === "card" && pmethod.card) {
        cardBrand = pmethod.card.brand;
        cardLast4 = pmethod.card.last4;
        cardExpMonth = pmethod.card.exp_month.toString();
        cardExpYear = pmethod.card.exp_year.toString();
      }
    } else if (customers.data[0].invoice_settings.default_payment_method) {
      // fallback: payment method set in the customer
      const pmethod = await stripe.paymentMethods.retrieve(customers.data[0].invoice_settings.default_payment_method as string);
      if (pmethod && pmethod.type === "card" && pmethod.card) {
        cardBrand = pmethod.card.brand;
        cardLast4 = pmethod.card.last4;
        cardExpMonth = pmethod.card.exp_month.toString();
        cardExpYear = pmethod.card.exp_year.toString();
      }
    }

    return new Response(JSON.stringify({
      plan_name: plan.nickname || plan.product,
      amount: plan.unit_amount,
      card_brand: cardBrand,
      card_last4: cardLast4,
      exp_month: cardExpMonth,
      exp_year: cardExpYear,
      status: subscription.status,
      subscription_id: subscription.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : String(err)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
