
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-USER-FROM-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID é obrigatório");
    }

    logStep("Processing session", { sessionId });

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
      throw new Error('Dados da compra não encontrados');
    }

    logStep("Pending purchase found", { purchaseId: pendingPurchase.id, planType: pendingPurchase.plan_type });

    const customerData = pendingPurchase.customer_data;

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

    logStep("Creating new user", { email: customerData.email, name: customerData.name });

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
        is_first_login: true,
        subscription_created_at: new Date().toISOString(),
        stripe_session_id: sessionId
      }
    });

    if (createError) {
      logStep('Error creating user', { error: createError });
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    logStep('User created successfully', { userId: newUser.user?.id, email: newUser.user?.email });

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
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
