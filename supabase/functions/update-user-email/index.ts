
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

    // === STRIPE CUSTOMER SEARCH AND UPDATE ===
    logStep("=== STRIPE UPDATE PHASE ===");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        logStep("Stripe client initialized");

        // STRATEGY 1: Search by old email
        logStep("Strategy 1: Searching customers by old email", { oldEmail });
        let customers = await stripe.customers.list({ 
          email: oldEmail, 
          limit: 10 
        });
        
        logStep("Old email search results", { 
          found: customers.data.length,
          customers: customers.data.map(c => ({ 
            id: c.id, 
            email: c.email, 
            created: c.created 
          }))
        });

        // STRATEGY 2: If no customers found by email, search by user metadata or recent customers
        if (customers.data.length === 0) {
          logStep("Strategy 2: Searching all recent customers for matches");
          const allRecentCustomers = await stripe.customers.list({ 
            limit: 100,
            created: { gte: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) } // Last 90 days
          });
          
          logStep("Recent customers search results", { 
            totalFound: allRecentCustomers.data.length
          });

          // Look for customers with matching email (case insensitive)
          const matchingByEmail = allRecentCustomers.data.filter(c => 
            c.email?.toLowerCase() === oldEmail?.toLowerCase()
          );

          if (matchingByEmail.length > 0) {
            customers = { 
              data: matchingByEmail, 
              has_more: false, 
              object: 'list', 
              url: '' 
            };
            logStep("Found customers by case-insensitive email match", { 
              count: matchingByEmail.length 
            });
          }
        }

        // STRATEGY 3: Search by Supabase user ID in metadata
        if (customers.data.length === 0) {
          logStep("Strategy 3: Searching by Supabase user ID in metadata");
          const allCustomers = await stripe.customers.list({ limit: 100 });
          const matchingByUserId = allCustomers.data.filter(c => 
            c.metadata?.supabase_user_id === user.id
          );

          if (matchingByUserId.length > 0) {
            customers = { 
              data: matchingByUserId, 
              has_more: false, 
              object: 'list', 
              url: '' 
            };
            logStep("Found customers by Supabase user ID", { 
              count: matchingByUserId.length 
            });
          }
        }

        if (customers.data.length > 0) {
          // Update all matching customers
          for (const customer of customers.data) {
            logStep("Updating Stripe customer", { 
              customerId: customer.id, 
              oldEmail: customer.email, 
              newEmail 
            });

            // Check if customer has active subscriptions before updating
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'active',
              limit: 10
            });

            logStep("Customer subscriptions found", {
              customerId: customer.id,
              activeSubscriptions: subscriptions.data.length,
              subscriptions: subscriptions.data.map(s => ({
                id: s.id,
                status: s.status,
                items: s.items.data.map(item => ({
                  price_id: item.price.id,
                  amount: item.price.unit_amount
                }))
              }))
            });

            // Update customer with new email and enhanced metadata
            const updatedCustomer = await stripe.customers.update(customer.id, {
              email: newEmail,
              metadata: {
                ...customer.metadata,
                supabase_user_id: user.id,
                email_updated_at: new Date().toISOString(),
                previous_email: oldEmail,
                updated_by_function: 'update-user-email'
              }
            });

            logStep("Stripe customer updated successfully", { 
              customerId: customer.id,
              newEmail: updatedCustomer.email,
              hasActiveSubscriptions: subscriptions.data.length > 0
            });
          }

          logStep("All matching Stripe customers updated", { 
            totalUpdated: customers.data.length 
          });
        } else {
          logStep("WARNING: No Stripe customers found for user", { 
            oldEmail, 
            userId: user.id 
          });
        }

      } catch (stripeError: any) {
        logStep("ERROR: Stripe update failed", { 
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          details: stripeError
        });
        // Don't fail the entire process for Stripe errors
      }
    } else {
      logStep("WARNING: STRIPE_SECRET_KEY not configured, skipping Stripe update");
    }

    // === SUPABASE UPDATES ===
    logStep("=== SUPABASE UPDATE PHASE ===");

    // Update email in auth.users using Admin API
    const { data: updatedUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: newEmail,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          email: newEmail,
          email_updated_at: new Date().toISOString(),
          previous_email: oldEmail
        }
      }
    );

    if (authError) {
      logStep("ERROR: Failed to update auth email", { error: authError });
      throw new Error(`Erro ao atualizar email de autenticação: ${authError.message}`);
    }

    logStep("Auth email updated successfully", { 
      userId: updatedUser.user?.id,
      newEmail: updatedUser.user?.email 
    });

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ email: newEmail })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("WARNING: Failed to update user profile", { error: profileError });
    } else {
      logStep("User profile updated successfully");
    }

    // Update company info if exists
    const { error: companyError } = await supabaseAdmin
      .from('company_info')
      .update({ email: newEmail })
      .eq('user_id', user.id);

    if (companyError) {
      logStep("WARNING: Failed to update company info", { error: companyError });
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
        stripeUpdated: !!stripeKey,
        userId: user.id
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
