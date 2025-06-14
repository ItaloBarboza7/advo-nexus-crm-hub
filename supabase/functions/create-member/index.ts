
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

    const userResponse = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (userResponse.error || !userResponse.data.user) {
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const adminUser = userResponse.data.user;

    const { name, email, password, phone, role } = await req.json()

    if (!name || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    const { count, error: countError } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('parent_user_id', adminUser.id);
      
    if (countError) throw countError;

    if (count !== null && count >= 3) {
      return new Response(JSON.stringify({ error: 'Você atingiu o limite de 3 membros.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Set to false for easier testing
    })

    if (authError) throw authError;

    const newUserId = newAuthUser.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: newUserId,
        parent_user_id: adminUser.id,
        name: name,
        email: email,
        phone: phone,
        title: role,
      })
      .select()
      .single()

    if (profileError) throw profileError;

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'member',
      })

    if (roleError) throw roleError;

    return new Response(JSON.stringify({ member: profile }), {
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
