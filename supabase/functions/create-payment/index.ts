
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate customer data
function validateCustomerData(customerData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!customerData?.name || customerData.name.trim().length === 0) {
    errors.push("Nome é obrigatório");
  }
  
  if (!customerData?.email || !isValidEmail(customerData.email)) {
    errors.push("Email válido é obrigatório");
  }
  
  if (!customerData?.phone || customerData.phone.trim().length === 0) {
    errors.push("Telefone é obrigatório");
  }
  
  if (!customerData?.cpf || customerData.cpf.trim().length === 0) {
    errors.push("CPF é obrigatório");
  }
  
  if (!customerData?.password || customerData.password.length < 6) {
    errors.push("Senha deve ter pelo menos 6 caracteres");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== CREATE PAYMENT FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  try {
    // Parse request body with detailed logging
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log("Raw request body:", rawBody);
      requestBody = JSON.parse(rawBody);
      console.log("Parsed request body:", JSON.stringify(requestBody, null, 2));
    } catch (error) {
      console.error("BODY PARSE ERROR:", error);
      return new Response(JSON.stringify({ 
        error: "Dados da requisição inválidos",
        details: "Falha ao processar dados enviados"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { customerData, planType } = requestBody;
    
    // Log extracted data
    console.log("Plan type:", planType);
    console.log("Customer data present:", !!customerData);
    if (customerData) {
      console.log("Customer data keys:", Object.keys(customerData));
      console.log("Customer email:", customerData.email);
      console.log("Customer name:", customerData.name);
    }

    // Validate customer data
    const validation = validateCustomerData(customerData);
    if (!validation.isValid) {
      console.error("VALIDATION FAILED:", validation.errors);
      return new Response(JSON.stringify({ 
        error: "Dados inválidos: " + validation.errors.join(", "),
        details: validation.errors
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("✅ Customer data validation passed");

    // Check environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:");
    console.log("- Stripe key present:", !!stripeSecretKey);
    console.log("- Stripe key length:", stripeSecretKey ? stripeSecretKey.length : 0);
    console.log("- Supabase URL present:", !!supabaseUrl);
    console.log("- Service key present:", !!supabaseServiceKey);

    if (!stripeSecretKey) {
      console.error("❌ STRIPE_SECRET_KEY not found");
      return new Response(JSON.stringify({ 
        error: "Configuração de pagamento não encontrada",
        details: "Chave do Stripe não configurada"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe
    let stripe;
    try {
      console.log("Initializing Stripe client...");
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });
      console.log("✅ Stripe client initialized successfully");
    } catch (error) {
      console.error("❌ STRIPE INIT ERROR:", error);
      return new Response(JSON.stringify({ 
        error: "Erro na configuração do processador de pagamento",
        details: "Falha ao inicializar Stripe"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Test Stripe connection
    try {
      console.log("Testing Stripe connection...");
      await stripe.customers.list({ limit: 1 });
      console.log("✅ Stripe connection test successful");
    } catch (error) {
      console.error("❌ STRIPE CONNECTION TEST FAILED:", error);
      return new Response(JSON.stringify({ 
        error: "Erro de conexão com o processador de pagamento",
        details: "Chave de pagamento inválida ou serviço indisponível"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Define price IDs with fallback
    const priceIds = {
      monthly: "price_1R6sLeBOsL29JKGmVYCqplxA",
      annual: "price_1R6sNwBOsL29JKGm5GpJZQ5W",
    };

    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      console.error("❌ INVALID PLAN TYPE:", planType);
      return new Response(JSON.stringify({ 
        error: `Plano inválido: ${planType}`,
        details: "Tipo de plano não reconhecido"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Using price ID:", priceId);

    // Verify price exists and is active
    try {
      console.log("Verifying Stripe price...");
      const price = await stripe.prices.retrieve(priceId);
      console.log("Price details:", {
        id: price.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount
      });
      
      if (!price.active) {
        console.error("❌ PRICE NOT ACTIVE:", priceId);
        return new Response(JSON.stringify({ 
          error: "Plano não está disponível no momento",
          details: "Preço do plano não está ativo"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      console.log("✅ Price verification successful");
    } catch (error) {
      console.error("❌ PRICE VERIFICATION ERROR:", error);
      return new Response(JSON.stringify({ 
        error: "Erro ao verificar plano de pagamento",
        details: "Plano não encontrado no sistema de pagamento"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Handle customer creation/lookup
    let customerId;
    try {
      console.log("Checking for existing customer...");
      const customers = await stripe.customers.list({ 
        email: customerData.email, 
        limit: 1 
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("✅ Existing customer found:", customerId);
      } else {
        console.log("Creating new customer...");
        const customer = await stripe.customers.create({
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          metadata: {
            cpf: customerData.cpf,
          },
        });
        customerId = customer.id;
        console.log("✅ New customer created:", customerId);
      }
    } catch (error) {
      console.error("❌ CUSTOMER OPERATION ERROR:", error);
      return new Response(JSON.stringify({ 
        error: "Erro ao processar dados do cliente",
        details: "Falha na criação ou busca do cliente"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Create checkout session
    console.log("Creating checkout session...");
    let session;
    try {
      const origin = req.headers.get("origin") || "https://xltugnmjbcowsuwzkkni.supabase.co";
      console.log("Using origin for URLs:", origin);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/landing`,
        locale: "pt-BR",
        allow_promotion_codes: true,
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
      });
      
      console.log("✅ Checkout session created successfully");
      console.log("Session ID:", session.id);
      console.log("Session URL:", session.url);
    } catch (error) {
      console.error("❌ CHECKOUT SESSION CREATION ERROR:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return new Response(JSON.stringify({ 
        error: "Erro ao criar sessão de pagamento",
        details: "Falha na criação da sessão do Stripe"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Store pending purchase (optional, non-blocking)
    if (supabaseUrl && supabaseServiceKey) {
      try {
        console.log("Storing pending purchase...");
        const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
          auth: { persistSession: false } 
        });

        const { error: insertError } = await supabase
          .from('pending_purchases')
          .insert({
            session_id: session.id,
            customer_data: customerData,
            plan_type: planType,
          });

        if (insertError) {
          console.warn("⚠️ Warning: Failed to store pending purchase:", insertError);
        } else {
          console.log("✅ Pending purchase stored successfully");
        }
      } catch (error) {
        console.warn("⚠️ Warning: Supabase operation failed:", error);
      }
    }

    console.log("=== PAYMENT CREATION SUCCESSFUL ===");
    console.log("Returning session URL:", session.url);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== UNHANDLED ERROR ===");
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor",
      details: "Falha inesperada no processamento do pagamento",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
