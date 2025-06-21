
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateMemberRequest {
  memberId: string;
  name: string;
  email: string;
  role: string;
  password?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId, name, email, role, password }: UpdateMemberRequest = await req.json();

    console.log(`Atualizando membro ${memberId} com email ${email}`);

    // Criar cliente Supabase com service role key para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Primeiro, atualizar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        name: name,
        email: email,
        title: role,
      })
      .eq('user_id', memberId);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
    }

    // Preparar dados para atualização do auth.users
    const updateData: any = {
      email: email,
      user_metadata: {
        name: name,
        email: email,
      }
    };

    // Se uma nova senha foi fornecida, incluí-la na atualização
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    // Atualizar dados de autenticação usando o Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      memberId,
      updateData
    );

    if (authError) {
      console.error('Erro ao atualizar dados de autenticação:', authError);
      throw new Error(`Erro ao atualizar autenticação: ${authError.message}`);
    }

    console.log(`Membro ${memberId} atualizado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Membro atualizado com sucesso',
        member: {
          id: memberId,
          name,
          email,
          role
        }
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função update-member:', error);
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
