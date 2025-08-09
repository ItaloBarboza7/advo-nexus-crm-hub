
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-USER-FROM-PAYMENT] ${step}${detailsStr}`);
};

const validateStripeSession = async (sessionId: string): Promise<any> => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY não configurado");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Validar que a sessão está completa e foi paga
    if (session.payment_status !== 'paid') {
      throw new Error(`Sessão não paga: ${session.payment_status}`);
    }
    
    if (session.status !== 'complete') {
      throw new Error(`Sessão não completa: ${session.status}`);
    }

    // Validar que não é muito antiga (máximo 1 hora)
    const sessionAge = Date.now() - (session.created * 1000);
    if (sessionAge > 3600000) { // 1 hora em ms
      throw new Error("Sessão muito antiga");
    }

    logStep("Stripe session validated", { 
      sessionId: sessionId.slice(0, 10) + '...', 
      paymentStatus: session.payment_status,
      status: session.status,
      created: session.created
    });

    return session;
  } catch (error) {
    logStep("Stripe session validation failed", { 
      sessionId: sessionId.slice(0, 10) + '...', 
      error: error.message 
    });
    throw error;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error("Session ID é obrigatório e deve ser uma string");
    }

    // Validar formato do session ID (Stripe session IDs começam com cs_)
    if (!sessionId.startsWith('cs_')) {
      throw new Error("Formato de Session ID inválido");
    }

    logStep("Processing session", { sessionId: sessionId.slice(0, 10) + '...' });

    // Validar sessão do Stripe ANTES de criar usuário
    const stripeSession = await validateStripeSession(sessionId);

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        } 
      }
    );

    // Get pending purchase data
    const { data: pendingPurchase, error: fetchError } = await supabase
      .from('pending_purchases')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !pendingPurchase) {
      logStep('Error fetching pending purchase', { error: fetchError });
      throw new Error('Dados da compra não encontrados ou sessão já processada');
    }

    logStep("Pending purchase found", { 
      purchaseId: pendingPurchase.id, 
      planType: pendingPurchase.plan_type,
      expires: pendingPurchase.expires_at
    });

    // Validar se a compra não expirou
    const purchaseExpiry = new Date(pendingPurchase.expires_at);
    if (purchaseExpiry < new Date()) {
      logStep("Purchase expired", { expires: pendingPurchase.expires_at });
      throw new Error('Dados da compra expiraram');
    }

    const customerData = pendingPurchase.customer_data;

    // Validar dados do cliente
    if (!customerData?.email || !customerData?.name || !customerData?.password) {
      throw new Error('Dados do cliente inválidos ou incompletos');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === customerData.email);

    if (userExists) {
      logStep("User already exists", { email: customerData.email });
      
      // Update existing user metadata with payment confirmation
      const existingUserData = existingUser.users.find(user => user.email === customerData.email);
      if (existingUserData) {
        await supabase.auth.admin.updateUserById(existingUserData.id, {
          user_metadata: {
            ...existingUserData.user_metadata,
            plan_type: pendingPurchase.plan_type,
            payment_confirmed: true,
            stripe_session_validated: true,
            updated_at: new Date().toISOString()
          }
        });
        logStep("Updated existing user metadata");
      }

      // Clean up pending purchase
      await supabase
        .from('pending_purchases')
        .delete()
        .eq('session_id', sessionId);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Usuário já existe, conta ativada com sucesso" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Creating new user", { 
      email: customerData.email, 
      name: customerData.name,
      planType: pendingPurchase.plan_type
    });

    // Create new user with enhanced metadata
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: customerData.email,
      password: customerData.password,
      email_confirm: true, // Auto-confirm email for paid users
      user_metadata: {
        name: customerData.name,
        phone: customerData.phone,
        cpf: customerData.cpf,
        plan_type: pendingPurchase.plan_type,
        payment_confirmed: true,
        stripe_session_validated: true,
        is_first_login: true,
        subscription_created_at: new Date().toISOString(),
        stripe_session_id: sessionId
      }
    });

    if (createError) {
      logStep('Error creating user', { error: createError });
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    logStep('User created successfully', { 
      userId: newUser.user?.id, 
      email: newUser.user?.email 
    });

    // Create user profile with the purchase data
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.user!.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
      });

    if (profileError) {
      logStep('Error creating user profile', { error: profileError });
      // Don't throw error here as user was created successfully
    } else {
      logStep('User profile created successfully');
    }

    // Clean up pending purchase after successful user creation
    const { error: deleteError } = await supabase
      .from('pending_purchases')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      logStep('Error deleting pending purchase', { error: deleteError });
      // Don't throw error here as user was created successfully
    } else {
      logStep('Pending purchase cleaned up');
    }

    logStep('User creation process completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      userId: newUser.user?.id,
      message: "Usuário criado com sucesso",
      planType: pendingPurchase.plan_type
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Error in create-user-from-payment', { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
