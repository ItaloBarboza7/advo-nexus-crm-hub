
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('delete-member function starting up')

serve(async (req) => {
  console.log('Received request:', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Creating Supabase admin client')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('Supabase admin client created')

    // 1. Authenticate the user calling the function
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Authorization header missing')
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('Authenticating calling user')
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)

    if (userError) {
      console.error('Authentication error:', userError)
      return new Response(JSON.stringify({ error: 'Authentication error: ' + userError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    
    if (!user) {
      console.error('User not found from JWT')
      return new Response(JSON.stringify({ error: 'Authentication error: User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    console.log('Calling user authenticated:', { id: user.id, email: user.email })

    // 2. Check if the calling user is an admin, with self-correction
    console.log('Checking if user is an admin')
    let { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError) {
      console.error('Error checking user role:', roleError)
      return new Response(JSON.stringify({ error: 'Database error checking role: ' + roleError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    let isUserAdmin = roleData?.role === 'admin'

    // If user has no explicit role, check if they are the primary account holder
    if (!isUserAdmin && !roleData) {
      console.log(`User ${user.id} has no role. Checking if they are primary user.`)
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking user profile for admin status:', profileError)
        // Don't block, just log. The final check will deny access.
      } else if (profileData && profileData.parent_user_id === null) {
        console.log(`User ${user.id} is the primary user. Granting admin access for this request.`)
        isUserAdmin = true
        
        // Self-correction: Add the 'admin' role to user_roles table to avoid this check in the future
        console.log(`Self-correcting: adding 'admin' role for user ${user.id}`)
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' }) // Use onConflict to avoid race conditions

        if (insertError && insertError.code !== '23505') { // 23505 is unique_violation, which is ok here
          // This is not a critical failure, so just log it and proceed.
          console.error(`Failed to self-correct admin role for user ${user.id}:`, insertError)
        } else {
          console.log(`Successfully self-corrected admin role for user ${user.id}`)
        }
      }
    }

    if (!isUserAdmin) {
      console.error('User is not an admin:', { userId: user.id, role: roleData?.role })
         return new Response(JSON.stringify({ error: 'Unauthorized: Not an admin' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        })
    }
    console.log('User is an admin')

    // 3. Get the member ID to be deleted from the request body
    console.log('Parsing request body')
    const body = await req.json()
    const { memberId } = body
    console.log('Request body parsed:', { memberId })

    if (!memberId) {
      console.error('memberId is missing from request body')
      return new Response(JSON.stringify({ error: 'Missing memberId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // Admins cannot delete themselves
    if (memberId === user.id) {
        console.error('Admin attempting to self-delete');
        return new Response(JSON.stringify({ error: 'Admins cannot delete their own account.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    console.log(`Starting deletion process for memberId: ${memberId}`)

    // 4. Delete from user_roles
    console.log(`Deleting from user_roles for memberId: ${memberId}`)
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', memberId)

    if (roleDeleteError) {
      console.error('Error deleting from user_roles:', roleDeleteError)
      throw new Error(`Failed to delete user role: ${roleDeleteError.message}`)
    }
    console.log('Successfully deleted from user_roles')

    // 5. Delete from user_profiles
    console.log(`Deleting from user_profiles for memberId: ${memberId}`)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', memberId)

    if (profileDeleteError) {
      console.error('Error deleting from user_profiles:', profileDeleteError)
      throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`)
    }
    console.log('Successfully deleted from user_profiles')

    // 6. Delete the user from the authentication system
    console.log(`Attempting to delete user from auth with ID: ${memberId}`)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      if (deleteError.message.includes('User not found')) {
        console.warn(`User ${memberId} not found in auth. It might have been deleted already. Proceeding as success.`)
      } else {
        throw deleteError
      }
    }
    console.log(`User ${memberId} deleted successfully from auth.`)

    return new Response(JSON.stringify({ message: 'Member deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Caught an unhandled error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
