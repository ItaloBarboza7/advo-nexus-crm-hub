import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Carregar e validar variáveis de ambiente
const RAW_BASE = Deno.env.get('WHATSAPP_GATEWAY_URL')?.trim()
const GATEWAY_BASE_URL = RAW_BASE && RAW_BASE !== '' ? RAW_BASE : 'https://evojuris-whatsapp.onrender.com'
const GATEWAY_TOKEN = Deno.env.get('WHATSAPP_GATEWAY_TOKEN')
const GATEWAY_ORIGIN_RAW = Deno.env.get('WHATSAPP_GATEWAY_ORIGIN') || GATEWAY_BASE_URL
const ALLOWED_ORIGINS_RAW = Deno.env.get('WHATSAPP_ALLOWED_ORIGINS') || ''

// Limpar origin - pegar apenas o primeiro valor se vier separado por vírgula
const GATEWAY_ORIGIN_DEFAULT = GATEWAY_ORIGIN_RAW.split(',')[0].trim()

// Parse allowed origins for dynamic CORS
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW ? ALLOWED_ORIGINS_RAW.split(',').map(o => o.trim()) : []

function getDynamicOrigin(requestOrigin: string | null): string {
  const allowedOrigins = Deno.env.get("WHATSAPP_ALLOWED_ORIGINS")?.split(',') || [];
  
  // Se não há origens configuradas, permite qualquer origem
  if (allowedOrigins.length === 0 || (allowedOrigins.length === 1 && !allowedOrigins[0].trim())) {
    console.log(`🌍 No origins configured, allowing all origins: *`);
    return '*';
  }

  if (requestOrigin) {
    for (const allowedOrigin of allowedOrigins) {
      const trimmed = allowedOrigin.trim();
      
      // Se contém wildcard
      if (trimmed.includes('*')) {
        const pattern = trimmed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(requestOrigin)) {
          console.log(`✅ Origin matched wildcard pattern: ${requestOrigin} -> ${trimmed}`);
          return requestOrigin;
        }
      } else if (trimmed === requestOrigin) {
        console.log(`✅ Origin matched exactly: ${requestOrigin}`);
        return requestOrigin;
      }
    }
  }

  // Fallback para permitir todas as origens se nenhuma match
  console.log(`⚠️ Origin not in allowlist, allowing all: ${requestOrigin} -> *`);
  return '*';
}

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Função para criar cliente Supabase com autenticação do usuário
function createSupabaseClientWithAuth(clientToken: string | null, clientApiKey: string | null) {
  if (!clientToken || !clientApiKey) {
    console.log('⚠️ Missing client authentication for Supabase fallback')
    return null
  }
  
  // Remover "Bearer " se presente no token
  const cleanToken = clientToken.replace(/^Bearer\s+/i, '')
  
  const supabase = createClient(SUPABASE_URL, clientApiKey, {
    global: {
      headers: {
        Authorization: `Bearer ${cleanToken}`
      }
    }
  })
  
  console.log('✅ Created Supabase client with user authentication')
  return supabase
}

// Função para fallback de criação de conexão no Supabase
async function createConnectionFallback(clientToken: string | null, clientApiKey: string | null, connectionData: any) {
  console.log('🔄 Attempting Supabase fallback for connection creation')
  
  const supabase = createSupabaseClientWithAuth(clientToken, clientApiKey)
  if (!supabase) {
    throw new Error('Cannot create Supabase client - missing authentication')
  }
  
  // Extrair dados necessários
  const { name, tenant_id, created_by_user_id } = connectionData
  
  if (!name || !tenant_id || !created_by_user_id) {
    throw new Error('Missing required fields: name, tenant_id, created_by_user_id')
  }
  
  console.log(`📝 Creating connection in Supabase: name=${name}, tenant_id=${tenant_id}`)
  
  const { data: connection, error } = await supabase
    .from('whatsapp_connections')
    .insert({
      name,
      tenant_id,
      created_by_user_id,
      phone_number: null,
      status: 'disconnected'
    })
    .select()
    .single()
  
  if (error) {
    console.error('❌ Supabase fallback error:', error)
    throw new Error(`Supabase fallback failed: ${error.message}`)
  }
  
  console.log('✅ Connection created successfully in Supabase (fallback)')
  return connection
}

// Utilitário: normalizar o path removendo TODOS os prefixos do proxy em loop
function normalizeProxyPath(pathname: string): string {
  const prefixes = [
    '/functions/v1/whatsapp-proxy',
    '/whatsapp-proxy',
  ]
  
  let out = pathname
  let changed = true
  
  // Loop até que nenhum prefixo seja mais removido
  while (changed) {
    changed = false
    for (const prefix of prefixes) {
      if (out.startsWith(prefix)) {
        out = out.substring(prefix.length)
        changed = true
        break // Restart the loop to check from beginning
      }
    }
  }
  
  // Garantir que comece com /
  if (!out.startsWith('/')) out = '/' + out
  
  return out
}

// Ensure contact exists in database
async function ensureContact(contactData: any, connectionId: string, tenantId: string, supabase: any) {
  try {
    const { error } = await supabase
      .from('whatsapp_contacts')
      .upsert({
        wa_id: contactData.wa_id || contactData.id,
        name: contactData.name,
        profile_pic_url: contactData.profile_pic_url || contactData.avatar,
        connection_id: connectionId,
        tenant_id: tenantId,
        is_blocked: contactData.is_blocked || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wa_id,connection_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ Error upserting contact:', error)
    } else {
      console.log('✅ Contact ensured:', contactData.name || contactData.wa_id)
    }
  } catch (error) {
    console.error('❌ Error in ensureContact:', error)
  }
}

// Ensure chat exists in database
async function ensureChat(chatData: any, connectionId: string, tenantId: string, supabase: any) {
  try {
    // Find contact for this chat
    const contactWaId = chatData.jid?.split('@')[0] || chatData.contact_id
    let contactId = null
    
    if (contactWaId) {
      const { data: contact } = await supabase
        .from('whatsapp_contacts')
        .select('id')
        .eq('wa_id', contactWaId)
        .eq('connection_id', connectionId)
        .single()
      
      contactId = contact?.id
    }

    const { error } = await supabase
      .from('whatsapp_chats')
      .upsert({
        jid: chatData.jid || chatData.id,
        name: chatData.name || chatData.title,
        type: chatData.type || 'user',
        unread_count: chatData.unread_count || 0,
        last_message_at: chatData.last_message_at ? new Date(chatData.last_message_at).toISOString() : null,
        connection_id: connectionId,
        contact_id: contactId,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'jid,connection_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ Error upserting chat:', error)
    } else {
      console.log('✅ Chat ensured:', chatData.name || chatData.jid)
    }
  } catch (error) {
    console.error('❌ Error in ensureChat:', error)
  }
}

// Insert or update message in database
async function insertOrUpdateMessage(messageData: any, chatId: string, connectionId: string, tenantId: string, supabase: any) {
  try {
    const { error } = await supabase
      .from('whatsapp_messages')
      .upsert({
        wa_message_id: messageData.id || messageData.message_id,
        chat_id: chatId,
        connection_id: connectionId,
        tenant_id: tenantId,
        direction: messageData.direction || (messageData.from_me ? 'outbound' : 'inbound'),
        type: messageData.type || 'text',
        body: messageData.body || messageData.text,
        author_wa_id: messageData.author || messageData.from,
        status: messageData.status || 'delivered',
        timestamp: messageData.timestamp ? new Date(messageData.timestamp * 1000).toISOString() : new Date().toISOString(),
        media_url: messageData.media_url,
        media_mime_type: messageData.media_mime_type,
        media_size: messageData.media_size,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wa_message_id,connection_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('❌ Error upserting message:', error)
    } else {
      console.log('✅ Message processed:', messageData.id)
      
      // Update chat's last_message_at
      await supabase
        .from('whatsapp_chats')
        .update({
          last_message_at: messageData.timestamp ? new Date(messageData.timestamp * 1000).toISOString() : new Date().toISOString()
        })
        .eq('id', chatId)
    }
  } catch (error) {
    console.error('❌ Error in insertOrUpdateMessage:', error)
  }
}

// Handle WhatsApp events and store in Supabase
async function handleWhatsAppEvent(eventData: any, supabase: any, clientToken: string | null, tenantId?: string, connectionId?: string) {
  try {
    const finalTenantId = tenantId || await getTenantIdFromToken(clientToken, supabase)
    if (!finalTenantId) {
      console.log('⚠️ Could not determine tenant ID for event processing')
      return
    }

    const eventType = eventData.type || 'unknown'
    const finalConnectionId = connectionId || eventData.connection_id
    console.log(`📨 Processing WhatsApp event: ${eventType} for connection ${finalConnectionId}`)

    switch (eventType) {
      case 'connection.ready':
      case 'connected':
      case 'qr':
        // Update connection status
        if (finalConnectionId && eventData.data) {
          const updateData: any = {
            updated_at: new Date().toISOString()
          }
          
          if (eventData.data.status) {
            updateData.status = eventData.data.status
          }
          
          if (eventData.data.phone_number || eventData.data.phoneNumber) {
            updateData.phone_number = eventData.data.phone_number || eventData.data.phoneNumber
            updateData.last_connected_at = new Date().toISOString()
          }
          
          if (eventData.data.qr_code || eventData.data.qr) {
            updateData.qr_code = eventData.data.qr_code || eventData.data.qr
          }

          console.log('🔄 Updating connection with data:', updateData)

          const { error } = await supabase
            .from('whatsapp_connections')
            .update(updateData)
            .eq('id', finalConnectionId)
            .eq('tenant_id', finalTenantId)

          if (error) {
            console.error('❌ Failed to update connection:', error)
          } else {
            console.log('✅ Connection updated successfully')
          }
        }
        break

      case 'contact':
      case 'contacts':
        // Handle single contact or contacts array
        const contacts = Array.isArray(eventData.data) ? eventData.data : [eventData.data]
        if (contacts.length > 0 && finalConnectionId) {
          for (const contact of contacts) {
            if (contact) {
              await ensureContact(contact, finalConnectionId, finalTenantId, supabase)
            }
          }
          console.log(`✅ Processed ${contacts.length} contacts`)
        }
        break

      case 'chat':
      case 'chats':
        // Handle single chat or chats array
        const chats = Array.isArray(eventData.data) ? eventData.data : [eventData.data]
        if (chats.length > 0 && finalConnectionId) {
          for (const chat of chats) {
            if (chat) {
              await ensureChat(chat, finalConnectionId, finalTenantId, supabase)
            }
          }
          console.log(`✅ Processed ${chats.length} chats`)
        }
        break

      case 'message':
      case 'messages':
        // Handle single message or messages array
        const messages = Array.isArray(eventData.data) ? eventData.data : [eventData.data]
        if (messages.length > 0 && finalConnectionId) {
          for (const message of messages) {
            if (message) {
              // Find the chat for this message
              const chatJid = message.chat_id || message.from || message.chatId
              const chatResult = await supabase
                .from('whatsapp_chats')
                .select('id')
                .eq('jid', chatJid)
                .eq('connection_id', finalConnectionId)
                .eq('tenant_id', finalTenantId)
                .single()

              if (chatResult.data) {
                await insertOrUpdateMessage(message, chatResult.data.id, finalConnectionId, finalTenantId, supabase)
              } else {
                console.log(`⚠️ Chat not found for message: ${chatJid}`)
              }
            }
          }
          console.log(`✅ Processed ${messages.length} messages`)
        }
        break

      case 'disconnected':
        // Handle disconnection events - update connection status
        if (finalConnectionId) {
          const { error } = await supabase
            .from('whatsapp_connections')
            .update({
              status: 'disconnected',
              qr_code: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', finalConnectionId)
            .eq('tenant_id', finalTenantId)

          if (error) {
            console.error('❌ Failed to update disconnected status:', error)
          } else {
            console.log('✅ Connection marked as disconnected')
          }
        }
        break

      case 'status':
        // Handle status change events
        if (finalConnectionId && eventData.data) {
          const status = eventData.data.status || eventData.data
          const updateData: any = {
            updated_at: new Date().toISOString()
          }

          if (status) {
            updateData.status = status
            if (status === 'disconnected') {
              updateData.qr_code = null
            }
          }

          const { error } = await supabase
            .from('whatsapp_connections')
            .update(updateData)
            .eq('id', finalConnectionId)
            .eq('tenant_id', finalTenantId)

          if (error) {
            console.error('❌ Failed to update status:', error)
          } else {
            console.log('✅ Connection status updated:', status)
          }
        }
        break

      case 'sync_complete':
        console.log('✅ WhatsApp sync completed')
        break

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`)
    }

  } catch (error) {
    console.error('❌ Error handling WhatsApp event:', error)
  }
}

// Extract tenant ID from client token
async function getTenantIdFromToken(clientToken: string | null, supabase: any): Promise<string | null> {
  if (!clientToken) return null
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(clientToken)
    if (error || !user) return null
    
    // Get tenant ID using the same logic from the function
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('parent_user_id')
      .eq('user_id', user.id)
      .single()
    
    return profile?.parent_user_id || user.id
  } catch (error) {
    console.error('❌ Error getting tenant ID from token:', error)
    return null
  }
}

// Process events stream and store in Supabase
async function processEventsStream(stream: ReadableStream, clientToken: string | null, clientApiKey: string | null) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  
  try {
    // Create Supabase client with service role for data writes
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6))
            await handleWhatsAppEvent(eventData, supabase, clientToken)
          } catch (error) {
            console.error('❌ Error parsing event data:', error, 'Line:', line)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing events stream:', error)
  } finally {
    reader.releaseLock()
  }
}

// Create a minimal Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Bootstrap sync handler
async function handleBootstrapSync(req: Request, parsedBase: URL, gatewayToken: string, supabase: any) {
  const url = new URL(req.url)
  const connectionId = url.searchParams.get('connection_id')
  const tenantId = url.searchParams.get('tenant_id')
  
  if (!connectionId || !tenantId) {
    return new Response(JSON.stringify({ error: 'Missing connection_id or tenant_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`🔄 Starting bootstrap sync for connection ${connectionId}`)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (gatewayToken) {
      headers['Authorization'] = `Bearer ${gatewayToken}`
    }

    // Try multiple endpoint patterns for each resource type
    const endpointSets = [
      { 
        name: 'contacts', 
        patterns: [
          `/connections/${connectionId}/contacts`,
          `/connection/${connectionId}/contacts`,
          `/api/connections/${connectionId}/contacts`,
          `/v1/connections/${connectionId}/contacts`,
          `/contacts?connection_id=${connectionId}`
        ]
      },
      { 
        name: 'chats', 
        patterns: [
          `/connections/${connectionId}/chats`,
          `/connection/${connectionId}/chats`,
          `/api/connections/${connectionId}/chats`,
          `/v1/connections/${connectionId}/chats`,
          `/chats?connection_id=${connectionId}`
        ]
      },
      { 
        name: 'messages', 
        patterns: [
          `/connections/${connectionId}/messages`,
          `/connection/${connectionId}/messages`,
          `/api/connections/${connectionId}/messages`,
          `/v1/connections/${connectionId}/messages`,
          `/messages?connection_id=${connectionId}`
        ]
      }
    ]

    let syncedCount = 0
    let totalItems = 0

    for (const endpointSet of endpointSets) {
      let resourceSynced = false
      
      for (const pattern of endpointSet.patterns) {
        if (resourceSynced) break
        
        try {
          console.log(`🎯 Trying ${endpointSet.name} endpoint: ${pattern}`)
          const response = await fetch(new URL(pattern, parsedBase).toString(), { headers })

          if (response.ok) {
            const data = await response.json()
            console.log(`📦 Got ${endpointSet.name} data from ${pattern}:`, Array.isArray(data) ? data.length : 'object')
            
            // Process and store the data
            if (Array.isArray(data) && data.length > 0) {
              for (const item of data) {
                await handleWhatsAppEvent({
                  type: endpointSet.name.slice(0, -1), // remove 's' from plural
                  data: item
                }, supabase, null, tenantId, connectionId)
              }
              syncedCount++
              totalItems += data.length
              resourceSynced = true
              console.log(`✅ Successfully synced ${data.length} ${endpointSet.name}`)
            } else if (data) {
              // Handle single object response
              await handleWhatsAppEvent({
                type: endpointSet.name.slice(0, -1),
                data: data
              }, supabase, null, tenantId, connectionId)
              syncedCount++
              totalItems += 1
              resourceSynced = true
              console.log(`✅ Successfully synced 1 ${endpointSet.name} item`)
            }
          } else {
            console.log(`❌ Bootstrap ${endpointSet.name} at ${pattern} failed: ${response.status}`)
          }
        } catch (error) {
          console.log(`❌ Bootstrap ${endpointSet.name} at ${pattern} error:`, error.message)
        }
      }
      
      if (!resourceSynced) {
        console.log(`⚠️ Could not sync ${endpointSet.name} from any endpoint`)
      }
    }

    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    return new Response(JSON.stringify({ 
      success: true, 
      synced_endpoints: syncedCount,
      total_items: totalItems,
      message: `Bootstrap sync completed - ${totalItems} items from ${syncedCount} resource types`
    }), {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': dynamicOrigin,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Bootstrap sync failed:', error)
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    return new Response(JSON.stringify({ error: 'Bootstrap sync failed' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': dynamicOrigin,
        'Content-Type': 'application/json'
      }
    })
  }
}

// Force reset connection handler - tries multiple endpoints to clear stuck sessions
async function handleForceResetConnection(req: Request, parsedBase: URL, gatewayToken: string, supabase: any) {
  const url = new URL(req.url)
  const connectionId = url.searchParams.get('connection_id')
  const tenantId = url.searchParams.get('tenant_id')
  
  if (!connectionId || !tenantId) {
    return new Response(JSON.stringify({ error: 'Missing connection_id or tenant_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`🔄 Force resetting connection ${connectionId} for tenant ${tenantId}`)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (gatewayToken) {
    headers['Authorization'] = `Bearer ${gatewayToken}`
  }

  // Try multiple reset/clear endpoints to force clear the session
  const resetEndpoints = [
    `/connections/${connectionId}/force-reset`,
    `/connections/${connectionId}/clear-session`,
    `/connections/${connectionId}/destroy`,
    `/connection/${connectionId}/force-reset`,
    `/connection/${connectionId}/clear-session`,
    `/connection/${connectionId}/destroy`,
    `/sessions/${connectionId}/destroy`,
    `/sessions/${connectionId}/clear`,
    `/session/${connectionId}/destroy`,
    `/session/${connectionId}/clear`,
    `/api/connections/${connectionId}/reset`,
    `/api/sessions/${connectionId}/reset`,
  ]

  let successCount = 0
  let errors: string[] = []

  for (const endpoint of resetEndpoints) {
    try {
      const resetUrl = new URL(endpoint, parsedBase)
      resetUrl.searchParams.append('tenant_id', tenantId)
      
      console.log(`🎯 Trying force reset endpoint: ${endpoint}`)
      
      const response = await fetch(resetUrl.toString(), {
        method: 'DELETE',
        headers,
      })
      
      if (response.ok) {
        console.log(`✅ Success on endpoint: ${endpoint}`)
        successCount++
      } else {
        const text = await response.text()
        const error = `${endpoint}: ${response.status} - ${text}`
        errors.push(error)
        console.log(`⚠️ Failed endpoint: ${error}`)
      }
    } catch (error) {
      const errorMsg = `${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.log(`❌ Error on endpoint: ${errorMsg}`)
    }
  }

  // Also try POST method for some endpoints
  const postResetEndpoints = [
    `/connections/${connectionId}/reset`,
    `/connection/${connectionId}/reset`,
    `/sessions/${connectionId}/reset`,
    `/session/${connectionId}/reset`,
  ]

  for (const endpoint of postResetEndpoints) {
    try {
      const resetUrl = new URL(endpoint, parsedBase)
      resetUrl.searchParams.append('tenant_id', tenantId)
      
      console.log(`🎯 Trying POST reset endpoint: ${endpoint}`)
      
      const response = await fetch(resetUrl.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ force: true, clear_session: true })
      })
      
      if (response.ok) {
        console.log(`✅ Success on POST endpoint: ${endpoint}`)
        successCount++
      } else {
        const text = await response.text()
        const error = `POST ${endpoint}: ${response.status} - ${text}`
        errors.push(error)
        console.log(`⚠️ Failed POST endpoint: ${error}`)
      }
    } catch (error) {
      const errorMsg = `POST ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.log(`❌ Error on POST endpoint: ${errorMsg}`)
    }
  }

  // Update connection status to disconnected in Supabase regardless of gateway response
  try {
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({ 
        status: 'disconnected',
        qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('❌ Failed to update connection status in Supabase:', updateError)
      errors.push(`Supabase update: ${updateError.message}`)
    } else {
      console.log('✅ Connection status reset in Supabase')
      successCount++
    }
  } catch (supabaseError) {
    console.error('❌ Error updating Supabase:', supabaseError)
    errors.push(`Supabase error: ${supabaseError}`)
  }

  return new Response(JSON.stringify({ 
    success: successCount > 0,
    successCount,
    totalAttempts: resetEndpoints.length + postResetEndpoints.length + 1, // +1 for Supabase
    message: successCount > 0 
      ? `Force reset completed. ${successCount} operations succeeded.`
      : 'Force reset failed on all endpoints',
    errors: errors.length > 5 ? errors.slice(0, 5).concat(['...more errors']) : errors
  }), {
    status: successCount > 0 ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Connection refresh handler
async function handleRefreshConnection(req: Request, parsedBase: URL, gatewayToken: string, supabase: any) {
  const url = new URL(req.url)
  const connectionId = url.searchParams.get('connection_id')
  const tenantId = url.searchParams.get('tenant_id')
  
  if (!connectionId || !tenantId) {
    return new Response(JSON.stringify({ error: 'Missing connection_id or tenant_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`🔄 Refreshing connection ${connectionId}`)

  try {
    const headers: Record<string, string> = {}
    if (gatewayToken) {
      headers['Authorization'] = `Bearer ${gatewayToken}`
    }

    // Try multiple endpoint patterns for getting connection info
    const endpointPatterns = [
      `/connections/${connectionId}`,
      `/connection/${connectionId}`,
      `/connections/${connectionId}/status`,
      `/api/connections/${connectionId}`,
      `/v1/connections/${connectionId}`
    ]

    let connectionData = null
    let lastError = null

    for (const endpoint of endpointPatterns) {
      try {
        console.log(`🎯 Trying endpoint: ${endpoint}`)
        const response = await fetch(new URL(endpoint, parsedBase).toString(), { headers })
        
        if (response.ok) {
          connectionData = await response.json()
          console.log(`✅ Connection data retrieved from ${endpoint}:`, connectionData)
          break
        } else {
          console.log(`❌ Endpoint ${endpoint} failed: ${response.status}`)
          lastError = `HTTP ${response.status}`
        }
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} error:`, error.message)
        lastError = error.message
      }
    }

    if (connectionData) {
      console.log('📱 Got connection data:', connectionData)
      
      // Update in Supabase
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          status: connectionData.status || 'unknown',
          phone_number: connectionData.phone_number || connectionData.phoneNumber || null,
          last_connected_at: connectionData.status === 'connected' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .eq('tenant_id', tenantId)

      if (error) {
        throw error
      }

      const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
      return new Response(JSON.stringify({ 
        success: true, 
        connection: connectionData,
        message: 'Connection refreshed'
      }), {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': dynamicOrigin,
          'Content-Type': 'application/json'
        }
      })
    } else {
      throw new Error(`All gateway endpoints failed. Last error: ${lastError}`)
    }

  } catch (error) {
    console.error('❌ Connection refresh failed:', error)
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    return new Response(JSON.stringify({ error: 'Connection refresh failed' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': dynamicOrigin,
        'Content-Type': 'application/json'
      }
    })
  }
}

// Disconnect connection handler
async function handleDisconnectConnection(req: Request, parsedBase: URL, gatewayToken: string, supabase: any) {
  const url = new URL(req.url)
  const connectionId = url.searchParams.get('connection_id')
  const tenantId = url.searchParams.get('tenant_id')
  
  if (!connectionId || !tenantId) {
    return new Response(JSON.stringify({ error: 'Missing connection_id or tenant_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`🔌 Disconnecting connection ${connectionId} for tenant ${tenantId}`)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (gatewayToken) {
    headers['Authorization'] = `Bearer ${gatewayToken}`
  }

  // Try multiple disconnect endpoints
  const disconnectEndpoints = [
    `/connections/${connectionId}/disconnect`,
    `/connection/${connectionId}/disconnect`, 
    `/connections/${connectionId}/logout`,
    `/connection/${connectionId}/logout`,
    `/sessions/${connectionId}/disconnect`,
    `/session/${connectionId}/disconnect`,
    `/api/connections/${connectionId}/disconnect`,
  ]

  let successCount = 0
  let errors: string[] = []

  for (const endpoint of disconnectEndpoints) {
    try {
      const disconnectUrl = new URL(endpoint, parsedBase)
      disconnectUrl.searchParams.append('tenant_id', tenantId)
      
      console.log(`🎯 Trying disconnect endpoint: ${endpoint}`)
      
      const response = await fetch(disconnectUrl.toString(), {
        method: 'POST',
        headers,
      })
      
      if (response.ok) {
        console.log(`✅ Success on endpoint: ${endpoint}`)
        successCount++
        break // Exit on first success
      } else {
        const text = await response.text()
        const error = `${endpoint}: ${response.status} - ${text}`
        errors.push(error)
        console.log(`⚠️ Failed endpoint: ${error}`)
      }
    } catch (error) {
      const errorMsg = `${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.log(`❌ Error on endpoint: ${errorMsg}`)
    }
  }

  // Always update connection status to disconnected in Supabase
  try {
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({ 
        status: 'disconnected',
        qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('❌ Failed to update connection status in Supabase:', updateError)
      errors.push(`Supabase update: ${updateError.message}`)
    } else {
      console.log('✅ Connection status updated to disconnected in Supabase')
      successCount++
    }
  } catch (supabaseError) {
    console.error('❌ Error updating Supabase:', supabaseError)
    errors.push(`Supabase error: ${supabaseError}`)
  }

  const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
  return new Response(JSON.stringify({ 
    success: successCount > 0,
    successCount,
    totalAttempts: disconnectEndpoints.length + 1, // +1 for Supabase
    message: successCount > 0 
      ? `Disconnect completed. Connection marked as disconnected.`
      : 'Disconnect failed on all endpoints, but status updated in database',
    errors: errors.length > 3 ? errors.slice(0, 3).concat(['...more errors']) : errors
  }), {
    status: 200, // Always return success since we update Supabase status
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': dynamicOrigin,
      'Content-Type': 'application/json'
    }
  })
}

console.log(`🔧 Proxy configuration:`)
console.log(`- Gateway URL: ${GATEWAY_BASE_URL}`)
console.log(`- Gateway Origin (default): ${GATEWAY_ORIGIN_DEFAULT}`)
console.log(`- Allowed Origins: ${ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS.join(', ') : 'None (using default)'}`)
console.log(`- Has Token: ${!!GATEWAY_TOKEN}`)

// Validar URL base
let parsedBase: URL | null = null
try {
  parsedBase = new URL(GATEWAY_BASE_URL.endsWith('/') ? GATEWAY_BASE_URL : GATEWAY_BASE_URL + '/')
} catch {
  console.error("❌ Invalid WHATSAPP_GATEWAY_URL:", GATEWAY_BASE_URL)
}

serve(async (req) => {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': dynamicOrigin,
      }
    })
  }

  try {
    const url = new URL(req.url)
    const rawPath = url.pathname
    let path = normalizeProxyPath(rawPath)

    // Handle bootstrap sync endpoint
    if (path === '/bootstrap' && req.method === 'GET') {
      return handleBootstrapSync(req, parsedBase, GATEWAY_TOKEN, supabase)
    }

    // Handle connection refresh endpoint - support both GET and POST
    if (path === '/refresh-connection' && (req.method === 'GET' || req.method === 'POST')) {
      return handleRefreshConnection(req, parsedBase, GATEWAY_TOKEN, supabase)
    }

    // Handle force reset connection endpoint
    if (path === '/force-reset-connection' && req.method === 'POST') {
      return handleForceResetConnection(req, parsedBase, GATEWAY_TOKEN, supabase)
    }

    // Handle disconnect connection endpoint
    if (path === '/disconnect-connection' && req.method === 'POST') {
      return handleDisconnectConnection(req, parsedBase, GATEWAY_TOKEN, supabase)
    }

    // Extrair autenticação do cliente (via query params para EventSource ou headers)
    const clientToken = url.searchParams.get('client_token') || req.headers.get('authorization')
    const clientApiKey = url.searchParams.get('client_apikey') || req.headers.get('apikey')
    
    console.log(`🔄 PROXY REQUEST:`)
    console.log(`- Original URL: ${req.url}`)
    console.log(`- Raw path: ${rawPath}`)
    console.log(`- Normalized path: ${path}`)
    console.log(`- Method: ${req.method}`)
    console.log(`🔐 Client auth - Token: ${clientToken ? 'Present' : 'Missing'}, ApiKey: ${clientApiKey ? 'Present' : 'Missing'}`)

    // Validar base antes de prosseguir
    if (!parsedBase) {
      console.error(`❌ Invalid base URL: ${GATEWAY_BASE_URL}`)
      return new Response(
        JSON.stringify({
          error: 'Proxy configuration error',
          details: `Invalid WHATSAPP_GATEWAY_URL: "${GATEWAY_BASE_URL}"`,
          hint: 'Configure o secret WHATSAPP_GATEWAY_URL com uma URL válida',
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir URL alvo de forma segura
    let targetUrl: string
    try {
      const target = new URL(path + url.search, parsedBase)
      targetUrl = target.toString()
    } catch (e) {
      console.error("❌ Failed to build target URL:", e)
      return new Response(
        JSON.stringify({
          error: 'URL construction failed',
          details: `Invalid URL: base="${parsedBase.toString()}" path="${path}" search="${url.search}"`,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Target URL: ${targetUrl}`)

    // Construir headers para o gateway usando origem fixa
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    const gatewayHeaders: Record<string, string> = {
      'User-Agent': 'Supabase-WhatsApp-Proxy/1.2',
      'Origin': GATEWAY_ORIGIN_DEFAULT, // Use fixed origin, not dynamic '*'
    }

    if (GATEWAY_TOKEN) {
      gatewayHeaders['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
      console.log('✅ Authorization header added')
    } else {
      console.log('⚠️ WARNING: No WHATSAPP_GATEWAY_TOKEN configured')
    }

    // Handle SSE endpoints with enhanced fallback
    if (path.includes('/events') || path.includes('/qr')) {
      const eventType = path.includes('/qr') ? 'QR' : 'Events'
      console.log(`🔄 Handling SSE request for: ${eventType}`)
      
      // Try multiple endpoint formats
      const fallbackPaths = [
        path,
        path.replace('/connections/', '/connection/'),
        `/events${url.search || ''}`,
        `/sse${url.search || ''}`,
        `/stream${url.search || ''}`
      ]
      
      let finalResponse = null
      let lastError = null

      for (const tryPath of fallbackPaths) {
        try {
          const targetUrl = new URL(tryPath, parsedBase)
          console.log(`🎯 Trying SSE URL: ${targetUrl.toString()}`)

          const headers: Record<string, string> = {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }

          if (GATEWAY_TOKEN) {
            headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
          }

          const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers,
          })

          console.log(`📡 SSE Response status: ${response.status} for ${tryPath}`)

          if (response.ok) {
            finalResponse = response
            break
          } else {
            lastError = `${response.status}: ${await response.text()}`
          }
        } catch (error) {
          lastError = error.message
          console.log(`⚠️ SSE endpoint failed: ${tryPath} - ${error.message}`)
        }
      }

      if (!finalResponse) {
        console.error(`❌ All SSE endpoints failed. Last error: ${lastError}`)
        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
        return new Response(
          JSON.stringify({ 
            error: 'Nenhum endpoint de eventos disponível', 
            mode: 'polling',
            fallback: true 
          }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Origin': dynamicOrigin,
              'Content-Type': 'application/json',
            }
          }
        )
      }

      // Tee the stream to process events while forwarding to client
      if (finalResponse.body && (clientToken || clientApiKey)) {
        const [stream1, stream2] = finalResponse.body.tee()
        
        // Process events in background
        processEventsStream(stream2, clientToken, clientApiKey)
          .catch(error => console.error('❌ Background event processing failed:', error))
        
        // Forward original stream to client
        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
        return new Response(stream1, {
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Origin': dynamicOrigin,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
      }

      // Forward response without processing if no auth
      const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
      return new Response(finalResponse.body, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': dynamicOrigin,
          'Content-Type': finalResponse.headers.get('Content-Type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // Handle regular POST requests (connections, etc.)
    if (req.method === 'POST' && path === '/connections') {
      // Parse request body for connection creation
      let requestBody: any = {};
      try {
        const bodyText = await req.text();
        requestBody = bodyText ? JSON.parse(bodyText) : {};
        console.log('📝 Parsed request body:', JSON.stringify(requestBody));
        console.log('📝 Body keys:', Object.keys(requestBody));
      } catch (error) {
        console.error('❌ Error parsing request body:', error);
      }

      // Validate required fields
      const { name, tenant_id } = requestBody;
      if (!name || !tenant_id) {
        console.error('❌ Missing required fields:', { name, tenant_id });
        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: name and tenant_id are required',
            received: { name, tenant_id }
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Origin': dynamicOrigin,
              'Content-Type': 'application/json',
            }
          }
        );
      }

      try {
        // First, try creating connection via gateway
        const postHeaders = {
          ...gatewayHeaders,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        console.log('📤 Sending to gateway:', { url: targetUrl, headers: postHeaders, body: requestBody });
        
        const gatewayResponse = await fetch(targetUrl, {
          method: req.method,
          headers: postHeaders,
          body: JSON.stringify(requestBody),
        });

        console.log(`📥 Gateway response status: ${gatewayResponse.status}`);
        console.log(`📥 Gateway response headers:`, JSON.stringify(Object.fromEntries(gatewayResponse.headers.entries()), null, 2));

        if (gatewayResponse.ok) {
          const responseBody = await gatewayResponse.json();
          console.log(`📄 Gateway response body:`, JSON.stringify(responseBody).substring(0, 500));

          const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
          return new Response(JSON.stringify(responseBody), {
            status: gatewayResponse.status,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Origin': dynamicOrigin,
              'Content-Type': 'application/json',
            }
          });
        } else {
          // Gateway failed, try Supabase fallback only if body has required fields
          console.log('🔄 Gateway failed, attempting Supabase fallback...');
          const gatewayErrorText = await gatewayResponse.text();
          console.log('❌ Gateway error response:', gatewayErrorText);
          
          if (clientToken && clientApiKey && name && tenant_id) {
            const fallbackConnection = await createConnectionFallback(clientToken, clientApiKey, requestBody);
            const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
            
            return new Response(JSON.stringify(fallbackConnection), {
              status: 201,
              headers: {
                ...corsHeaders,
                'Access-Control-Allow-Origin': dynamicOrigin,
                'Content-Type': 'application/json',
              }
            });
          } else {
            throw new Error(`Gateway failed and fallback not possible - Missing: ${!clientToken ? 'clientToken ' : ''}${!clientApiKey ? 'clientApiKey ' : ''}${!name ? 'name ' : ''}${!tenant_id ? 'tenant_id' : ''}`);
          }
        }

      } catch (error) {
        console.error('❌ Connection creation failed:', error);
        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
        
        return new Response(
          JSON.stringify({ 
            error: 'Falha ao criar conexão', 
            details: error.message 
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Origin': dynamicOrigin,
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // Handle POST connections/:id/connect
    if (req.method === 'POST' && path.match(/^\/connections\/[^\/]+\/connect$/)) {
      try {
        const gatewayResponse = await fetch(targetUrl, {
          method: req.method,
          headers: gatewayHeaders,
        });

        console.log(`📥 Gateway response status: ${gatewayResponse.status}`);

        const responseText = await gatewayResponse.text();
        console.log(`📄 Gateway response body:`, responseText.substring(0, 500));

        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
        
        return new Response(responseText, {
          status: gatewayResponse.status,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Origin': dynamicOrigin,
            'Content-Type': gatewayResponse.headers.get('Content-Type') || 'application/json',
          }
        });

      } catch (error) {
        console.error('❌ Connection connect failed:', error);
        const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
        
        return new Response(
          JSON.stringify({ 
            error: 'Falha ao conectar', 
            details: error.message 
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Origin': dynamicOrigin,
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // Handle all other requests by forwarding to gateway
    try {
      // Para outros métodos, copiar corpo da requisição
      let body: BodyInit | null = null;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        body = await req.blob();
      }

      // Copiar headers relevantes do request original
      const requestHeaders = { ...gatewayHeaders };
      if (req.headers.get('Content-Type')) {
        requestHeaders['Content-Type'] = req.headers.get('Content-Type')!;
      }

      const gatewayResponse = await fetch(targetUrl, {
        method: req.method,
        headers: requestHeaders,
        body,
      });

      console.log(`📥 Gateway response status: ${gatewayResponse.status}`);

      const responseBody = await gatewayResponse.text();
      console.log(`📄 Gateway response body:`, responseBody.substring(0, 500));

      const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
      
      return new Response(responseBody, {
        status: gatewayResponse.status,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': dynamicOrigin,
          'Content-Type': gatewayResponse.headers.get('Content-Type') || 'application/json',
        }
      });

    } catch (error) {
      console.error('❌ Gateway request failed:', error);
      const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha na comunicação com gateway WhatsApp', 
          details: error.message 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Origin': dynamicOrigin,
            'Content-Type': 'application/json',
          }
        }
      );
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'));
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do proxy', 
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': dynamicOrigin,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});