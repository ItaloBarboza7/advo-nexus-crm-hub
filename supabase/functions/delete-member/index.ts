
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Autenticar o usuário que está chamando a função
    const userResponse = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (userResponse.error || !userResponse.data.user) {
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const callingUser = userResponse.data.user;

    // Verificar se o usuário que chama é um admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
         return new Response(JSON.stringify({ error: 'Unauthorized: Not an admin' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        })
    }

    // Obter o ID do membro a ser excluído
    const { memberId } = await req.json()
    if (!memberId) {
      return new Response(JSON.stringify({ error: 'Missing memberId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Excluir o usuário do sistema de autenticação
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)

    if (deleteError) {
      if (deleteError.message.includes('User not found')) {
         return new Response(JSON.stringify({ error: 'User not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        })
      }
      throw deleteError
    }

    return new Response(JSON.stringify({ message: 'Member deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
