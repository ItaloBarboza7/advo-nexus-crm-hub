
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID é obrigatório");
    }

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
      console.error('Error fetching pending purchase:', fetchError);
      throw new Error('Dados da compra não encontrados');
    }

    const customerData = pendingPurchase.customer_data;

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === customerData.email);

    if (userExists) {
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

    // Create new user
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
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    // Clean up pending purchase after successful user creation
    const { error: deleteError } = await supabase
      .from('pending_purchases')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Error deleting pending purchase:', deleteError);
      // Don't throw error here as user was created successfully
    }

    console.log('User created successfully:', newUser.user?.email);

    return new Response(JSON.stringify({ 
      success: true,
      userId: newUser.user?.id,
      message: "Usuário criado com sucesso"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating user from payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro ao criar usuário" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
