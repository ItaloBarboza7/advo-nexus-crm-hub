
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced logging function
const logWithTimestamp = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` - ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level}] ${message}${dataStr}`);
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

// Retry function with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logWithTimestamp("WARN", `Attempt ${attempt} failed, retrying in ${delay}ms`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  logWithTimestamp("INFO", "=== CREATE PAYMENT FUNCTION STARTED ===");
  logWithTimestamp("INFO", "Request details", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    // Parse request body with timeout
    let requestBody;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for body parsing
      
      const rawBody = await req.text();
      clearTimeout(timeoutId);
      
      logWithTimestamp("INFO", "Raw request body received", { length: rawBody.length });
      requestBody = JSON.parse(rawBody);
      logWithTimestamp("INFO", "Request body parsed successfully", {
        hasCustomerData: !!requestBody.customerData,
        planType: requestBody.planType
      });
    } catch (error) {
      logWithTimestamp("ERROR", "Body parse error", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Dados da requisição inválidos",
        details: "Falha ao processar dados enviados"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { customerData, planType } = requestBody;

    // Validate customer data
    const validation = validateCustomerData(customerData);
    if (!validation.isValid) {
      logWithTimestamp("ERROR", "Validation failed", { errors: validation.errors });
      return new Response(JSON.stringify({ 
        error: "Dados inválidos: " + validation.errors.join(", "),
        details: validation.errors
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logWithTimestamp("INFO", "Customer data validation passed");

    // Check environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    logWithTimestamp("INFO", "Environment variables check", {
      hasStripeKey: !!stripeSecretKey,
      stripeKeyLength: stripeSecretKey ? stripeSecretKey.length : 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!stripeSecretKey) {
      logWithTimestamp("ERROR", "STRIPE_SECRET_KEY not found");
      return new Response(JSON.stringify({ 
        error: "Configuração de pagamento não encontrada",
        details: "Chave do Stripe não configurada"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initialize Stripe with retry
    let stripe;
    try {
      logWithTimestamp("INFO", "Initializing Stripe client");
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });
      logWithTimestamp("INFO", "Stripe client initialized successfully");
    } catch (error) {
      logWithTimestamp("ERROR", "Stripe initialization failed", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Erro na configuração do processador de pagamento",
        details: "Falha ao inicializar Stripe"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Test Stripe connection with retry
    try {
      logWithTimestamp("INFO", "Testing Stripe connection");
      await withRetry(() => stripe.customers.list({ limit: 1 }), 2, 1000);
      logWithTimestamp("INFO", "Stripe connection test successful");
    } catch (error) {
      logWithTimestamp("ERROR", "Stripe connection test failed", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Erro de conexão com o processador de pagamento",
        details: "Serviço de pagamento indisponível"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Define price IDs
    const priceIds = {
      monthly: "price_1RiRTsC8OCBSCVdTFXjUpEhw",
      annual: "price_1RiRTsC8OCBSCVdTqgo1iE56",
    };

    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      logWithTimestamp("ERROR", "Invalid plan type", { planType });
      return new Response(JSON.stringify({ 
        error: `Plano inválido: ${planType}`,
        details: "Tipo de plano não reconhecido"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logWithTimestamp("INFO", "Using price ID", { priceId, planType });

    // Verify price exists with retry
    try {
      logWithTimestamp("INFO", "Verifying Stripe price");
      const price = await withRetry(() => stripe.prices.retrieve(priceId), 2, 1000);
      
      if (!price.active) {
        logWithTimestamp("ERROR", "Price not active", { priceId });
        return new Response(JSON.stringify({ 
          error: "Plano não está disponível no momento",
          details: "Preço do plano não está ativo"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      logWithTimestamp("INFO", "Price verification successful", {
        id: price.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount
      });
    } catch (error) {
      logWithTimestamp("ERROR", "Price verification failed", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Erro ao verificar plano de pagamento",
        details: "Plano não encontrado no sistema de pagamento"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Handle customer creation/lookup with retry
    let customerId;
    try {
      logWithTimestamp("INFO", "Checking for existing customer");
      const customers = await withRetry(
        () => stripe.customers.list({ email: customerData.email, limit: 1 }),
        2,
        1000
      );

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logWithTimestamp("INFO", "Existing customer found", { customerId });
      } else {
        logWithTimestamp("INFO", "Creating new customer");
        const customer = await withRetry(
          () => stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
            metadata: {
              cpf: customerData.cpf,
            },
          }),
          2,
          1000
        );
        customerId = customer.id;
        logWithTimestamp("INFO", "New customer created", { customerId });
      }
    } catch (error) {
      logWithTimestamp("ERROR", "Customer operation failed", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Erro ao processar dados do cliente",
        details: "Falha na criação ou busca do cliente"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Create checkout session with retry
    logWithTimestamp("INFO", "Creating checkout session");
    let session;
    try {
      const origin = req.headers.get("origin") || "https://xltugnmjbcowsuwzkkni.supabase.co";
      logWithTimestamp("INFO", "Using origin for URLs", { origin });

      session = await withRetry(
        () => stripe.checkout.sessions.create({
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
        }),
        2,
        1000
      );
      
      logWithTimestamp("INFO", "Checkout session created successfully", {
        sessionId: session.id,
        hasUrl: !!session.url
      });
    } catch (error) {
      logWithTimestamp("ERROR", "Checkout session creation failed", { error: error.message });
      return new Response(JSON.stringify({ 
        error: "Erro ao criar sessão de pagamento",
        details: "Falha na criação da sessão do Stripe"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Store pending purchase (non-blocking)
    if (supabaseUrl && supabaseServiceKey) {
      try {
        logWithTimestamp("INFO", "Storing pending purchase");
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
          logWithTimestamp("WARN", "Failed to store pending purchase", { error: insertError.message });
        } else {
          logWithTimestamp("INFO", "Pending purchase stored successfully");
        }
      } catch (error) {
        logWithTimestamp("WARN", "Supabase operation failed", { error: error.message });
      }
    }

    logWithTimestamp("INFO", "Payment creation successful", {
      sessionId: session.id,
      url: session.url
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logWithTimestamp("ERROR", "Unhandled error in create-payment", {
      errorType: typeof error,
      message: error?.message,
      stack: error?.stack
    });
    
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
