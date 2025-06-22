
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserEmailRequest {
  newEmail: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail }: UpdateUserEmailRequest = await req.json();

    console.log(`Atualizando email do usuário para: ${newEmail}`);

    // Criar cliente Supabase com service role key para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter o usuário atual
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      console.error('Erro ao obter usuário:', userError);
      throw new Error('Usuário não autenticado');
    }

    console.log(`Usuário identificado: ${user.id}, email atual: ${user.email}`);

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
      console.error('Erro ao atualizar email de autenticação:', authError);
      throw new Error(`Erro ao atualizar email de autenticação: ${authError.message}`);
    }

    // Atualizar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        email: newEmail,
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      // Não falhar aqui, pois o email de auth já foi atualizado
    }

    // Atualizar informações da empresa se existirem
    const { error: companyError } = await supabaseAdmin
      .from('company_info')
      .update({
        email: newEmail,
      })
      .eq('user_id', user.id);

    if (companyError) {
      console.error('Erro ao atualizar empresa:', companyError);
      // Não falhar aqui, pois o email de auth já foi atualizado
    }

    console.log(`Email atualizado com sucesso para: ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email atualizado com sucesso',
        newEmail
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função update-user-email:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
