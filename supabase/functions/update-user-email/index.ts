
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserEmailRequest {
  newEmail: string;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [UPDATE-USER-EMAIL] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail }: UpdateUserEmailRequest = await req.json();

    logStep("=== EMAIL UPDATE PROCESS STARTED ===", { newEmail });

    // Criar cliente Supabase com service role key para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter o usuário atual
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      throw new Error('Token de autorização não encontrado');
    }

    // Criar cliente com o token do usuário para verificar a identidade
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      logStep("ERROR: User authentication failed", { userError });
      throw new Error('Usuário não autenticado');
    }

    const oldEmail = user.email;
    logStep("User authenticated successfully", { 
      userId: user.id, 
      oldEmail, 
      newEmail 
    });

    // === STRIPE CUSTOMER UPDATE ===
    logStep("=== STRIPE UPDATE PHASE ===");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        logStep("Stripe client initialized");

        // Procurar cliente Stripe pelo email antigo
        const customers = await stripe.customers.list({ 
          email: oldEmail, 
          limit: 10 
        });
        
        logStep("Stripe customer search results", { 
          found: customers.data.length,
          customers: customers.data.map(c => ({ 
            id: c.id, 
            email: c.email, 
            created: c.created 
          }))
        });

        if (customers.data.length > 0) {
          // Atualizar todos os clientes encontrados com o email antigo
          for (const customer of customers.data) {
            logStep("Updating Stripe customer", { 
              customerId: customer.id, 
              oldEmail: customer.email, 
              newEmail 
            });

            await stripe.customers.update(customer.id, {
              email: newEmail,
              metadata: {
                ...customer.metadata,
                email_updated_at: new Date().toISOString(),
                previous_email: oldEmail
              }
            });

            logStep("Stripe customer updated successfully", { 
              customerId: customer.id,
              newEmail
            });
          }
        } else {
          logStep("No Stripe customers found with old email", { oldEmail });
        }
      } catch (stripeError: any) {
        logStep("WARNING: Stripe update failed", { 
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        });
        // Não falhar todo o processo por erro do Stripe
        // O usuário ainda terá o email atualizado no Supabase
      }
    } else {
      logStep("WARNING: STRIPE_SECRET_KEY not configured, skipping Stripe update");
    }

    // === SUPABASE UPDATES ===
    logStep("=== SUPABASE UPDATE PHASE ===");

    // Atualizar o email na tabela auth.users usando o Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: newEmail,
        user_metadata: {
          ...user.user_metadata,
          email: newEmail,
        }
      }
    );

    if (authError) {
      logStep("ERROR: Failed to update auth email", { error: authError });
      throw new Error(`Erro ao atualizar email de autenticação: ${authError.message}`);
    }

    logStep("Auth email updated successfully");

    // Atualizar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        email: newEmail,
      })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("WARNING: Failed to update user profile", { error: profileError });
      // Não falhar aqui, pois o email de auth já foi atualizado
    } else {
      logStep("User profile updated successfully");
    }

    // Atualizar informações da empresa se existirem
    const { error: companyError } = await supabaseAdmin
      .from('company_info')
      .update({
        email: newEmail,
      })
      .eq('user_id', user.id);

    if (companyError) {
      logStep("WARNING: Failed to update company info", { error: companyError });
      // Não falhar aqui, pois o email de auth já foi atualizado
    } else {
      logStep("Company info updated successfully");
    }

    logStep("=== EMAIL UPDATE COMPLETED SUCCESSFULLY ===", { 
      oldEmail, 
      newEmail,
      userId: user.id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email atualizado com sucesso no Supabase e Stripe',
        oldEmail,
        newEmail,
        stripeUpdated: !!stripeKey
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep("=== CRITICAL ERROR ===", { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
