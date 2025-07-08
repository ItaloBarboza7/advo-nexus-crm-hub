
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
  
  if (!customerData.name || customerData.name.trim().length === 0) {
    errors.push("Nome é obrigatório");
  }
  
  if (!customerData.email || !isValidEmail(customerData.email)) {
    errors.push("Email válido é obrigatório");
  }
  
  if (!customerData.phone || customerData.phone.trim().length === 0) {
    errors.push("Telefone é obrigatório");
  }
  
  if (!customerData.cpf || customerData.cpf.trim().length === 0) {
    errors.push("CPF é obrigatório");
  }
  
  if (!customerData.password || customerData.password.length < 6) {
    errors.push("Senha deve ter pelo menos 6 caracteres");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Retry mechanism for Stripe operations
async function retryStripeOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Payment Creation Started ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);

  try {
    // Verify Stripe Secret Key is available
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("Configuração de pagamento não encontrada");
    }

    console.log("Stripe key found, length:", stripeSecretKey.length);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (error) {
      console.error("Failed to parse request body:", error);
      throw new Error("Dados da requisição inválidos");
    }

    const { customerData, planType } = requestBody;
    console.log("Plan type:", planType);
    console.log("Customer data keys:", Object.keys(customerData || {}));

    // Validate customer data
    const validation = validateCustomerData(customerData);
    if (!validation.isValid) {
      console.error("Customer data validation failed:", validation.errors);
      return new Response(JSON.stringify({ 
        error: "Dados inválidos: " + validation.errors.join(", ")
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Customer data validation passed");

    // Initialize Stripe with key verification
    let stripe;
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });
      console.log("Stripe client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Stripe:", error);
      throw new Error("Erro na configuração do processador de pagamento");
    }

    // Verify Stripe key by making a test call
    try {
      await stripe.customers.list({ limit: 1 });
      console.log("Stripe key verification successful");
    } catch (error) {
      console.error("Stripe key verification failed:", error);
      throw new Error("Chave de pagamento inválida");
    }

    // Use updated Stripe price IDs
    const priceIds = {
      monthly: "price_1R6sLeBOsL29JKGmVYCqplxA",
      annual: "price_1R6sNwBOsL29JKGm5GpJZQ5W",
    };

    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      console.error("Invalid plan type:", planType);
      throw new Error(`Plano inválido: ${planType}`);
    }

    console.log("Using price ID:", priceId);

    // Verify price ID exists in Stripe
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log("Price verification successful:", price.id, price.active);
      if (!price.active) {
        throw new Error("Price is not active");
      }
    } catch (error) {
      console.error("Price verification failed:", error);
      throw new Error("Plano de pagamento não encontrado");
    }

    // Check if customer already exists with retry
    let customerId;
    try {
      const customers = await retryStripeOperation(
        () => stripe.customers.list({ 
          email: customerData.email, 
          limit: 1 
        })
      );

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Existing customer found:", customerId);
      } else {
        // Create new customer with retry
        console.log("Creating new customer...");
        const customer = await retryStripeOperation(
          () => stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
            metadata: {
              cpf: customerData.cpf,
            },
          })
        );
        customerId = customer.id;
        console.log("New customer created:", customerId);
      }
    } catch (error) {
      console.error("Customer operations failed:", error);
      if (error.message && error.message.includes("email")) {
        throw new Error("Email inválido para processamento de pagamento");
      }
      throw new Error("Erro ao processar dados do cliente");
    }

    // Create checkout session with retry
    console.log("Creating checkout session...");
    let session;
    try {
      session = await retryStripeOperation(
        () => stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.get("origin")}/landing`,
          locale: "pt-BR",
          allow_promotion_codes: true,
        })
      );
      console.log("Checkout session created:", session.id);
    } catch (error) {
      console.error("Checkout session creation failed:", error);
      throw new Error("Erro ao criar sessão de pagamento");
    }

    // Store customer data temporarily until payment confirmation
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    try {
      const { error: insertError } = await supabase
        .from('pending_purchases')
        .insert({
          session_id: session.id,
          customer_data: customerData,
          plan_type: planType,
        });

      if (insertError) {
        console.error('Error storing pending purchase:', insertError);
        // Don't throw here as the session was created successfully
        console.log('Continuing despite storage error...');
      } else {
        console.log('Pending purchase stored successfully');
      }
    } catch (error) {
      console.error('Supabase operation failed:', error);
      // Don't throw here as the session was created successfully
    }

    console.log("=== Payment Creation Successful ===");
    console.log("Session URL:", session.url);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('=== Payment Creation Failed ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide user-friendly error messages
    let userMessage = "Erro interno do servidor";
    
    if (error.message.includes("Dados inválidos") || 
        error.message.includes("Email inválido") ||
        error.message.includes("Plano inválido")) {
      userMessage = error.message;
    } else if (error.message.includes("Chave de pagamento inválida") ||
               error.message.includes("Configuração de pagamento não encontrada")) {
      userMessage = "Serviço de pagamento temporariamente indisponível";
    } else if (error.message.includes("Plano de pagamento não encontrado")) {
      userMessage = "Plano selecionado não está disponível";
    } else if (error.message.includes("Erro ao processar dados do cliente") ||
               error.message.includes("Erro ao criar sessão de pagamento")) {
      userMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      error: userMessage,
      details: error.message // Include details for debugging
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
