
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-MEMBER] ${step}${detailsStr}`);
};

const validateAdminPermissions = async (supabase: any, adminUserId: string): Promise<void> => {
  // Verificar se o usuário é admin (não tem parent_user_id)
  const { data: adminProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('parent_user_id')
    .eq('user_id', adminUserId)
    .single();

  if (profileError) {
    logStep('Error fetching admin profile', { error: profileError });
    throw new Error('Erro ao verificar permissões de administrador');
  }

  if (adminProfile.parent_user_id !== null) {
    logStep('Unauthorized: user is not admin', { userId: adminUserId });
    throw new Error('Apenas administradores podem atualizar membros');
  }

  logStep('Admin permissions validated', { adminUserId });
};

const validateMemberScope = async (supabase: any, adminUserId: string, memberId: string): Promise<void> => {
  // Verificar se o membro pertence ao tenant do admin
  const { data: memberProfile, error: memberError } = await supabase
    .from('user_profiles')
    .select('parent_user_id, user_id')
    .eq('user_id', memberId)
    .single();

  if (memberError) {
    logStep('Error fetching member profile', { error: memberError });
    throw new Error('Membro não encontrado');
  }

  // O membro deve ter o admin como parent_user_id
  if (memberProfile.parent_user_id !== adminUserId) {
    logStep('Unauthorized: member does not belong to admin', { 
      memberId, 
      memberParent: memberProfile.parent_user_id, 
      adminUserId 
    });
    throw new Error('Você não tem permissão para atualizar este membro');
  }

  logStep('Member scope validated', { memberId, adminUserId });
};

const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    throw new Error('Input deve ser uma string');
  }
  
  return input.trim().slice(0, 255); // Limitar tamanho e remover espaços
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Extrair token de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização obrigatório");
    }

    const token = authHeader.replace("Bearer ", "");

    // Criar cliente Supabase com service role key para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar usuário autenticado
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      logStep('Authentication failed', { error: userError });
      throw new Error('Token de autorização inválido');
    }

    const adminUserId = userData.user.id;
    logStep('User authenticated', { adminUserId });

    // Validar permissões de administrador
    await validateAdminPermissions(supabaseAdmin, adminUserId);

    const { memberId, name, email, role, password }: UpdateMemberRequest = await req.json();

    // Validar e sanitizar dados de entrada
    if (!memberId || !name || !email || !role) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos');
    }

    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedRole = sanitizeInput(role);

    // Validar formato do email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      throw new Error('Formato de email inválido');
    }

    // Validar se o memberId é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId)) {
      throw new Error('ID do membro inválido');
    }

    logStep(`Updating member ${memberId}`, { 
      email: sanitizedEmail,
      role: sanitizedRole
    });

    // Validar escopo do membro
    await validateMemberScope(supabaseAdmin, adminUserId, memberId);

    // Primeiro, atualizar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        name: sanitizedName,
        email: sanitizedEmail,
        title: sanitizedRole,
      })
      .eq('user_id', memberId);

    if (profileError) {
      logStep('Error updating profile', { error: profileError });
      throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
    }

    // Preparar dados para atualização do auth.users
    const updateData: any = {
      email: sanitizedEmail,
      user_metadata: {
        name: sanitizedName,
        email: sanitizedEmail,
        updated_by_admin: adminUserId,
        updated_at: new Date().toISOString()
      }
    };

    // Se uma nova senha foi fornecida, incluí-la na atualização
    if (password && password.trim() !== '') {
      const sanitizedPassword = password.trim();
      if (sanitizedPassword.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }
      updateData.password = sanitizedPassword;
      logStep('Password update included');
    }

    // Atualizar dados de autenticação usando o Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      memberId,
      updateData
    );

    if (authError) {
      logStep('Error updating auth data', { error: authError });
      throw new Error(`Erro ao atualizar autenticação: ${authError.message}`);
    }

    logStep(`Member ${memberId} updated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Membro atualizado com sucesso',
        member: {
          id: memberId,
          name: sanitizedName,
          email: sanitizedEmail,
          role: sanitizedRole
        }
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep('Error in update-member', { error: errorMessage });
    
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
