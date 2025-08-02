
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckEmailRequest {
  email: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: CheckEmailRequest = await req.json();

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'Email é obrigatório',
          available: false 
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        }
      );
    }

    // Criar cliente Supabase com service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar se já existe um usuário com este email
    const { data: existingUsers, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Erro ao verificar usuários existentes:', listUsersError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno do servidor',
          available: false 
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500,
        }
      );
    }

    const emailExists = existingUsers.users.some(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    );

    return new Response(
      JSON.stringify({ 
        available: !emailExists,
        email: email.toLowerCase()
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na verificação de email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        available: false
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
