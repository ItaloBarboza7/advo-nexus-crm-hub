
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerData, planType } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Define plan prices (in cents)
    const planPrices = {
      monthly: 15700, // R$ 157.00
      annual: 9900,   // R$ 99.00
    };

    const amount = planPrices[planType as keyof typeof planPrices];
    const planName = planType === 'monthly' 
      ? 'CRM Profissional - Mensal' 
      : 'CRM Profissional - Anual';

    // Check if customer already exists
    const customers = await stripe.customers.list({ 
      email: customerData.email, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: {
          cpf: customerData.cpf,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: planName,
              description: planType === 'monthly' 
                ? 'Plano mensal do CRM Profissional'
                : 'Plano anual do CRM Profissional (cobrança anual)',
            },
            unit_amount: amount,
            ...(planType === 'annual' && {
              recurring: { interval: "year" }
            }),
            ...(planType === 'monthly' && {
              recurring: { interval: "month" }
            }),
          },
          quantity: 1,
        },
      ],
      mode: planType === 'monthly' || planType === 'annual' ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/landing`,
      locale: "pt-BR",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro ao processar pagamento" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
