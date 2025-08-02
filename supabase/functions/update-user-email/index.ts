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

// Função para avaliar prioridade de clientes
const evaluateCustomerPriority = async (stripe: Stripe, customer: any, userId: string): Promise<number> => {
  let priority = 0;
  
  // +100 pontos se tem supabase_user_id correspondente
  if (customer.metadata?.supabase_user_id === userId) {
    priority += 100;
  }
  
  // +50 pontos para cada assinatura ativa
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });
    priority += subscriptions.data.length * 50;
  } catch (error) {
    logStep("Error checking subscriptions for priority", { customerId: customer.id, error });
  }
  
  // +10 pontos se foi criado mais recentemente (baseado em timestamp)
  const daysSinceCreation = (Date.now() / 1000 - customer.created) / (24 * 60 * 60);
  if (daysSinceCreation < 30) {
    priority += Math.max(0, 10 - Math.floor(daysSinceCreation / 3));
  }
  
  logStep("Customer priority calculated", {
    customerId: customer.id,
    email: customer.email,
    priority,
    hasMatchingUserId: customer.metadata?.supabase_user_id === userId,
    created: new Date(customer.created * 1000).toISOString()
  });
  
  return priority;
};

// Função para consolidar clientes duplicados
const consolidateDuplicateCustomers = async (stripe: Stripe, customers: any[], userId: string, newEmail: string) => {
  if (customers.length <= 1) return customers;
  
  logStep("=== STARTING CUSTOMER CONSOLIDATION ===", {
    totalCustomers: customers.length,
    customerEmails: customers.map(c => ({ id: c.id, email: c.email }))
  });
  
  // Avaliar prioridade de cada cliente
  const customersWithPriority = [];
  for (const customer of customers) {
    const priority = await evaluateCustomerPriority(stripe, customer, userId);
    customersWithPriority.push({ customer, priority });
  }
  
  // Ordenar por prioridade (maior primeiro)
  customersWithPriority.sort((a, b) => b.priority - a.priority);
  
  const primaryCustomer = customersWithPriority[0].customer;
  const duplicateCustomers = customersWithPriority.slice(1).map(item => item.customer);
  
  logStep("Primary customer selected", {
    primaryId: primaryCustomer.id,
    primaryEmail: primaryCustomer.email,
    primaryPriority: customersWithPriority[0].priority,
    duplicatesCount: duplicateCustomers.length
  });
  
  // Transferir assinaturas dos clientes duplicados para o principal
  for (const duplicateCustomer of duplicateCustomers) {
    try {
      logStep("Processing duplicate customer", {
        duplicateId: duplicateCustomer.id,
        duplicateEmail: duplicateCustomer.email
      });
      
      // Buscar assinaturas do cliente duplicado
      const subscriptions = await stripe.subscriptions.list({
        customer: duplicateCustomer.id,
        limit: 100
      });
      
      logStep("Found subscriptions to transfer", {
        customerId: duplicateCustomer.id,
        subscriptionCount: subscriptions.data.length,
        subscriptions: subscriptions.data.map(s => ({
          id: s.id,
          status: s.status,
          priceId: s.items.data[0]?.price?.id
        }))
      });
      
      // Transferir cada assinatura para o cliente principal
      for (const subscription of subscriptions.data) {
        if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
          logStep("Transferring subscription", {
            subscriptionId: subscription.id,
            fromCustomer: duplicateCustomer.id,
            toCustomer: primaryCustomer.id,
            status: subscription.status
          });
          
          await stripe.subscriptions.update(subscription.id, {
            customer: primaryCustomer.id,
            metadata: {
              ...subscription.metadata,
              transferred_from: duplicateCustomer.id,
              transferred_at: new Date().toISOString(),
              transfer_reason: 'customer_consolidation'
            }
          });
          
          logStep("Subscription transferred successfully", {
            subscriptionId: subscription.id,
            newCustomer: primaryCustomer.id
          });
        }
      }
      
      // Buscar métodos de pagamento do cliente duplicado
      const paymentMethods = await stripe.paymentMethods.list({
        customer: duplicateCustomer.id,
        limit: 100
      });
      
      logStep("Found payment methods to transfer", {
        customerId: duplicateCustomer.id,
        paymentMethodCount: paymentMethods.data.length
      });
      
      // Transferir métodos de pagamento para o cliente principal
      for (const paymentMethod of paymentMethods.data) {
        try {
          await stripe.paymentMethods.attach(paymentMethod.id, {
            customer: primaryCustomer.id
          });
          
          logStep("Payment method transferred", {
            paymentMethodId: paymentMethod.id,
            type: paymentMethod.type,
            toCustomer: primaryCustomer.id
          });
        } catch (pmError: any) {
          logStep("Warning: Could not transfer payment method", {
            paymentMethodId: paymentMethod.id,
            error: pmError.message
          });
        }
      }
      
      // Aguardar um pouco antes de deletar para garantir que as transferências foram processadas
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Deletar o cliente duplicado
      await stripe.customers.del(duplicateCustomer.id);
      
      logStep("Duplicate customer deleted successfully", {
        deletedCustomerId: duplicateCustomer.id,
        deletedCustomerEmail: duplicateCustomer.email
      });
      
    } catch (error: any) {
      logStep("Error processing duplicate customer", {
        customerId: duplicateCustomer.id,
        error: error.message,
        type: error.type,
        code: error.code
      });
    }
  }
  
  // Atualizar metadados do cliente principal
  try {
    await stripe.customers.update(primaryCustomer.id, {
      email: newEmail,
      metadata: {
        ...primaryCustomer.metadata,
        supabase_user_id: userId,
        email_updated_at: new Date().toISOString(),
        consolidated_duplicates: 'true',
        consolidation_date: new Date().toISOString(),
        original_duplicates_count: duplicateCustomers.length.toString()
      }
    });
    
    logStep("Primary customer metadata updated", {
      customerId: primaryCustomer.id,
      newEmail,
      consolidatedCount: duplicateCustomers.length
    });
  } catch (error: any) {
    logStep("Error updating primary customer metadata", {
      customerId: primaryCustomer.id,
      error: error.message
    });
  }
  
  logStep("=== CUSTOMER CONSOLIDATION COMPLETED ===", {
    primaryCustomerId: primaryCustomer.id,
    consolidatedCustomers: duplicateCustomers.length
  });
  
  return [primaryCustomer];
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

    // Verificar se já existe um usuário com o novo email
    logStep("=== CHECKING EMAIL AVAILABILITY ===");
    const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      logStep("ERROR: Failed to check existing users", { error: listUsersError });
      throw new Error('Erro ao verificar disponibilidade do email');
    }

    const emailExists = existingUsers.users.some(existingUser => 
      existingUser.email?.toLowerCase() === newEmail.toLowerCase() && 
      existingUser.id !== user.id
    );

    if (emailExists) {
      logStep("ERROR: Email already exists", { newEmail });
      return new Response(
        JSON.stringify({ 
          error: 'Este email já está sendo usado por outra conta',
          success: false,
          code: 'EMAIL_ALREADY_EXISTS'
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 409, // Conflict status
        }
      );
    }

    logStep("Email is available, proceeding with update");

    // === STRIPE CUSTOMER SEARCH AND CONSOLIDATION ===
    logStep("=== STRIPE UPDATE PHASE ===");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        logStep("Stripe client initialized");

        // ESTRATÉGIA DE BUSCA ABRANGENTE - buscar por ambos os emails
        const searchEmails = [oldEmail, newEmail].filter(Boolean);
        const allFoundCustomers = new Map<string, any>();
        
        logStep("Searching for customers by multiple emails", { searchEmails });

        // Buscar por cada email
        for (const email of searchEmails) {
          if (email) {
            try {
              const customers = await stripe.customers.list({ 
                email: email, 
                limit: 10 
              });
              
              logStep(`Found customers for email ${email}`, { 
                count: customers.data.length,
                customers: customers.data.map(c => ({ 
                  id: c.id, 
                  email: c.email, 
                  created: c.created,
                  metadata: c.metadata 
                }))
              });
              
              // Adicionar ao mapa (evita duplicatas por ID)
              customers.data.forEach(customer => {
                allFoundCustomers.set(customer.id, customer);
              });
            } catch (error: any) {
              logStep(`Error searching for email ${email}`, { error: error.message });
            }
          }
        }

        // Buscar por Supabase user ID nos metadados
        try {
          logStep("Searching by Supabase user ID in metadata");
          const allCustomers = await stripe.customers.list({ limit: 100 });
          const matchingByUserId = allCustomers.data.filter(c => 
            c.metadata?.supabase_user_id === user.id
          );
          
          logStep("Found customers by user ID metadata", { 
            count: matchingByUserId.length,
            customers: matchingByUserId.map(c => ({ 
              id: c.id, 
              email: c.email,
              metadata: c.metadata 
            }))
          });
          
          matchingByUserId.forEach(customer => {
            allFoundCustomers.set(customer.id, customer);
          });
        } catch (error: any) {
          logStep("Error searching by user ID", { error: error.message });
        }

        const customersArray = Array.from(allFoundCustomers.values());
        
        logStep("Total unique customers found", { 
          totalCount: customersArray.length,
          customerIds: customersArray.map(c => c.id)
        });

        if (customersArray.length > 0) {
          // Consolidar clientes duplicados se houver mais de um
          const consolidatedCustomers = await consolidateDuplicateCustomers(
            stripe, 
            customersArray, 
            user.id, 
            newEmail
          );
          
          logStep("Customer consolidation completed", { 
            originalCount: customersArray.length,
            finalCount: consolidatedCustomers.length,
            primaryCustomerId: consolidatedCustomers[0]?.id
          });
          
        } else {
          logStep("WARNING: No Stripe customers found for user", { 
            oldEmail, 
            newEmail,
            userId: user.id 
          });
        }
        
      } catch (stripeError: any) {
        logStep("ERROR: Stripe operations failed", { 
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        });
        // Não falhar o processo inteiro por erros do Stripe
      }
    } else {
      logStep("WARNING: STRIPE_SECRET_KEY not configured, skipping Stripe operations");
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
          previous_email: oldEmail,
          customer_consolidation_performed: true
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
        message: 'Email atualizado com sucesso',
        oldEmail,
        newEmail,
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
