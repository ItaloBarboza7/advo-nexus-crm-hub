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

// Função para determinar origem dinamicamente com base na allowlist
function getDynamicOrigin(requestOrigin: string | null): string {
  if (!requestOrigin || ALLOWED_ORIGINS.length === 0) {
    return GATEWAY_ORIGIN_DEFAULT
  }
  
  for (const allowedOrigin of ALLOWED_ORIGINS) {
    if (allowedOrigin.startsWith('*.')) {
      // Suporte a wildcard para subdomínios
      const domain = allowedOrigin.substring(2)
      if (requestOrigin.endsWith(domain)) {
        console.log(`✅ Dynamic origin matched wildcard ${allowedOrigin}: ${requestOrigin}`)
        return requestOrigin
      }
    } else if (requestOrigin === allowedOrigin) {
      console.log(`✅ Dynamic origin matched exact: ${requestOrigin}`)
      return requestOrigin
    }
  }
  
  console.log(`⚠️ Origin not in allowlist, using default: ${requestOrigin} -> ${GATEWAY_ORIGIN_DEFAULT}`)
  return GATEWAY_ORIGIN_DEFAULT
}

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Validar URL base
let parsedBase: URL | null = null
try {
  parsedBase = new URL(GATEWAY_BASE_URL.endsWith('/') ? GATEWAY_BASE_URL : GATEWAY_BASE_URL + '/')
} catch {
  console.error("❌ Invalid WHATSAPP_GATEWAY_URL:", GATEWAY_BASE_URL)
}

console.log(`🔧 Proxy configuration:`)
console.log(`- Gateway URL: ${parsedBase ? parsedBase.toString() : 'INVALID'}`)
console.log(`- Gateway Origin (default): ${GATEWAY_ORIGIN_DEFAULT}`)
console.log(`- Allowed Origins: ${ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS.join(', ') : 'None (using default)'}`)
console.log(`- Has Token: ${!!GATEWAY_TOKEN}`)

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

// Process events stream and store in Supabase
async function processEventsStream(stream: ReadableStream, clientToken: string | null, clientApiKey: string | null) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  try {
    // Create Supabase client with service role for data writes
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            await handleWhatsAppEvent(eventData, supabase, clientToken);
          } catch (error) {
            console.error('❌ Error parsing event data:', error, 'Line:', line);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing events stream:', error);
  } finally {
    reader.releaseLock();
  }
}

// Handle individual WhatsApp events and store in database
async function handleWhatsAppEvent(eventData: any, supabase: any, clientToken: string | null) {
  console.log('📡 Processing WhatsApp event:', eventData.type || 'unknown', eventData);
  
  try {
    const tenantId = await getTenantIdFromToken(clientToken, supabase);
    if (!tenantId) {
      console.warn('⚠️ No tenant ID found for event processing');
      return;
    }

    switch (eventData.type) {
      case 'connection.ready':
      case 'connection.authenticated': {
        if (eventData.connection_id && eventData.phone_number) {
          await supabase
            .from('whatsapp_connections')
            .update({
              status: 'connected',
              phone_number: eventData.phone_number,
              last_connected_at: new Date().toISOString()
            })
            .eq('id', eventData.connection_id)
            .eq('tenant_id', tenantId);
          
          console.log('✅ Updated connection with phone number:', eventData.phone_number);
        }
        break;
      }
      
      case 'contacts': {
        if (eventData.contacts && Array.isArray(eventData.contacts)) {
          for (const contact of eventData.contacts) {
            await supabase
              .from('whatsapp_contacts')
              .upsert({
                wa_id: contact.wa_id,
                name: contact.name,
                profile_pic_url: contact.profile_pic_url,
                connection_id: eventData.connection_id,
                tenant_id: tenantId,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'wa_id,connection_id'
              });
          }
          console.log('✅ Processed contacts:', eventData.contacts.length);
        }
        break;
      }
      
      case 'chats': {
        if (eventData.chats && Array.isArray(eventData.chats)) {
          for (const chat of eventData.chats) {
            // Find contact for this chat
            const { data: contact } = await supabase
              .from('whatsapp_contacts')
              .select('id')
              .eq('wa_id', chat.jid?.split('@')[0])
              .eq('connection_id', eventData.connection_id)
              .single();

            await supabase
              .from('whatsapp_chats')
              .upsert({
                jid: chat.jid,
                name: chat.name,
                type: chat.type || 'user',
                unread_count: chat.unread_count || 0,
                last_message_at: chat.last_message_at,
                connection_id: eventData.connection_id,
                contact_id: contact?.id,
                tenant_id: tenantId,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'jid,connection_id'
              });
          }
          console.log('✅ Processed chats:', eventData.chats.length);
        }
        break;
      }
      
      case 'messages': {
        if (eventData.messages && Array.isArray(eventData.messages)) {
          for (const message of eventData.messages) {
            // Find chat for this message
            const { data: chat } = await supabase
              .from('whatsapp_chats')
              .select('id')
              .eq('jid', message.chat_jid)
              .eq('connection_id', eventData.connection_id)
              .single();

            if (chat) {
              await supabase
                .from('whatsapp_messages')
                .upsert({
                  wa_message_id: message.id,
                  chat_id: chat.id,
                  connection_id: eventData.connection_id,
                  tenant_id: tenantId,
                  direction: message.direction || (message.from_me ? 'outbound' : 'inbound'),
                  type: message.type || 'text',
                  body: message.body,
                  author_wa_id: message.author || message.from,
                  status: message.status || 'delivered',
                  timestamp: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
                  media_url: message.media_url,
                  media_mime_type: message.media_mime_type,
                  media_size: message.media_size,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'wa_message_id,connection_id'
                });

              // Update chat's last_message_at
              await supabase
                .from('whatsapp_chats')
                .update({
                  last_message_at: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString()
                })
                .eq('id', chat.id);
            }
          }
          console.log('✅ Processed messages:', eventData.messages.length);
        }
        break;
      }
      
      case 'message': {
        // Single message event
        const message = eventData;
        const { data: chat } = await supabase
          .from('whatsapp_chats')
          .select('id')
          .eq('jid', message.chat_jid || message.from)
          .eq('connection_id', eventData.connection_id)
          .single();

        if (chat) {
          await supabase
            .from('whatsapp_messages')
            .upsert({
              wa_message_id: message.id,
              chat_id: chat.id,
              connection_id: eventData.connection_id,
              tenant_id: tenantId,
              direction: message.direction || (message.from_me ? 'outbound' : 'inbound'),
              type: message.type || 'text',
              body: message.body,
              author_wa_id: message.author || message.from,
              status: message.status || 'delivered',
              timestamp: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'wa_message_id,connection_id'
            });

          // Update chat's last_message_at
          await supabase
            .from('whatsapp_chats')
            .update({
              last_message_at: message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString()
            })
            .eq('id', chat.id);

          console.log('✅ Processed single message:', message.id);
        }
        break;
      }
      
      default:
        console.log('📝 Unhandled event type:', eventData.type);
    }
  } catch (error) {
    console.error('❌ Error handling WhatsApp event:', error);
  }
}

// Extract tenant ID from client token
async function getTenantIdFromToken(clientToken: string | null, supabase: any): Promise<string | null> {
  if (!clientToken) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(clientToken);
    if (error || !user) return null;
    
    // Get tenant ID using the same logic from the function
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('parent_user_id')
      .eq('user_id', user.id)
      .single();
    
    return profile?.parent_user_id || user.id;
  } catch (error) {
    console.error('❌ Error getting tenant ID from token:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const rawPath = url.pathname
    let path = normalizeProxyPath(rawPath)

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

    // Construir headers para o gateway usando origem dinâmica
    const dynamicOrigin = getDynamicOrigin(req.headers.get('origin'))
    const gatewayHeaders: Record<string, string> = {
      'User-Agent': 'Supabase-WhatsApp-Proxy/1.2',
      'Origin': dynamicOrigin,
    }

    if (GATEWAY_TOKEN) {
      gatewayHeaders['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
      console.log('✅ Authorization header added')
    } else {
      console.log('⚠️ WARNING: No WHATSAPP_GATEWAY_TOKEN configured')
    }

    // Handle SSE requests (QR Code stream, Events stream)
    if (path.includes('/qr') || path.includes('/events')) {
      console.log(`🔄 Handling SSE request for: ${path.includes('/qr') ? 'QR Code' : 'Events'}`);
      
      // Add client auth parameters to the query if available
      const url = new URL(targetUrl);
      if (clientToken) {
        url.searchParams.set('client_token', clientToken);
      }
      if (clientApiKey) {
        url.searchParams.set('client_apikey', clientApiKey);
      }
      
      // For events endpoint, try /connections/:id/events first, then fallback to /events?connection_id=:id
      let finalResponse;
      const isEventsStream = path.includes('/events');
      
      try {
        // First attempt with original URL
        const response = await fetch(url.toString(), {
          method: req.method,
          headers: gatewayHeaders,
        });
        
        console.log(`📡 SSE Response status:`, response.status);
        
        // If 404 on events endpoint, try fallback format
        if (response.status === 404 && isEventsStream) {
          console.log('🔄 Trying events endpoint fallback format...');
          
          // Extract connection ID from path /connections/:id/events
          const connectionIdMatch = path.match(/\/connections\/([^\/]+)\/events/);
          if (connectionIdMatch) {
            const connectionId = connectionIdMatch[1];
            const fallbackUrl = new URL(targetUrl);
            fallbackUrl.pathname = '/events';
            fallbackUrl.searchParams.set('connection_id', connectionId);
            
            const fallbackResponse = await fetch(fallbackUrl.toString(), {
              method: req.method,
              headers: gatewayHeaders,
            });
            
            console.log(`📡 Fallback SSE Response status:`, fallbackResponse.status);
            finalResponse = fallbackResponse;
          } else {
            finalResponse = response;
          }
        } else {
          finalResponse = response;
        }
      } catch (error) {
        console.error('❌ SSE Gateway connection error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'SSE Gateway connection error', 
            details: error?.message || String(error)
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error(`❌ SSE Gateway error: ${finalResponse.status} - ${errorText}`);
        
        return new Response(
          JSON.stringify({ 
            error: 'SSE Gateway error', 
            status: finalResponse.status,
            details: errorText 
          }),
          { status: finalResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For events stream, we need to tee the stream to process and store events
      if (isEventsStream && finalResponse.body) {
        const readable = finalResponse.body;
        const [stream1, stream2] = readable.tee();
        
        // Process events in background without blocking the response
        processEventsStream(stream2, clientToken, clientApiKey).catch(error => {
          console.error('❌ Error processing events stream:', error);
        });
        
        // Return the original stream to client
        return new Response(stream1, {
          status: finalResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }
      
      // Return the SSE stream directly for QR code streams
      return new Response(finalResponse.body, {
        status: finalResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Handle POST /connections (com fallback de criação via Supabase)
    if (req.method === 'POST' && path === '/connections') {
      console.log('🔗 Handling connection creation request')
      
      const requestBody = await req.text()
      console.log('📤 Request body:', requestBody)
      
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: { ...gatewayHeaders, 'Content-Type': 'application/json' },
        body: requestBody,
      })
      
      console.log(`📥 Gateway response status: ${response.status}`)
      
      // Se sucesso, retornar resposta do gateway
      if (response.ok) {
        const responseBody = await response.text()
        console.log('📄 Gateway response body (success):', responseBody.substring(0, 300))
        return new Response(responseBody, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
          }
        })
      }
      
      // Se gateway falhou E temos autenticação do cliente, tentar fallback
      const errorText = await response.text()
      console.error(`❌ Gateway connection creation failed: ${response.status} - ${errorText}`)
      
      if (clientToken && clientApiKey) {
        console.log('🔄 Gateway failed, attempting Supabase fallback...')
        
        try {
          const connectionData = JSON.parse(requestBody)
          const supabaseConnection = await createConnectionFallback(clientToken, clientApiKey, connectionData)
          
          console.log('✅ Supabase fallback successful:', supabaseConnection)
          return new Response(JSON.stringify(supabaseConnection), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
          
        } catch (fallbackError: any) {
          console.error('❌ Supabase fallback also failed:', fallbackError)
          // Continue com o erro original do gateway se o fallback falhou
        }
      }
      
      // Mensagens de erro mais específicas
      let errorHint = ''
      if (response.status === 401) {
        errorHint = 'Token de autenticação inválido ou expirado'
      } else if (response.status === 403) {
        errorHint = 'Origin não permitido no gateway ou token sem permissões'
      } else if (response.status === 404) {
        errorHint = 'Endpoint não encontrado no gateway'
      } else if (response.status >= 500) {
        errorHint = 'Erro interno do gateway - verifique se o serviço está online'
      }

      return new Response(
        JSON.stringify({ 
          error: 'Gateway error', 
          status: response.status,
          statusText: response.statusText,
          details: errorText,
          hint: errorHint,
          timestamp: new Date().toISOString(),
          target_url: targetUrl,
          proxy_path: path,
          original_url: req.url
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle POST /connections/:id/connect
    if (req.method === 'POST' && normalizeProxyPath(rawPath).match(/^\/connections\/[^\/]+\/connect$/)) {
      console.log('🔗 Handling connection connect request')
      
      const targetUrl = new URL(path + url.search, parsedBase)
      
      console.log(`🎯 Connect target URL: ${targetUrl}`)
      
      try {
        console.log(`📤 Connect request headers to gateway:`, JSON.stringify(gatewayHeaders, null, 2))
        
        const response = await fetch(targetUrl.toString(), {
          method: 'POST',
          headers: gatewayHeaders,
        })
        
        console.log(`📥 Connect response status: ${response.status}`)
        
        if (response.ok) {
          const responseData = await response.text()
          return new Response(responseData, {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': response.headers.get('Content-Type') || 'application/json',
            },
          })
        } else {
          const errorText = await response.text()
          console.error(`❌ Connect error response: ${response.status} - ${errorText}`)
          return new Response(JSON.stringify({ 
            error: `Connect failed: ${response.status}`,
            details: errorText 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } catch (error) {
        console.error('❌ Connect request error:', error)
        return new Response(JSON.stringify({ 
          error: 'Connect request failed', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Handle general requests
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: gatewayHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    console.log(`📥 Gateway response status: ${response.status}`)
    console.log(`📥 Gateway response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Gateway error: ${response.status} - ${errorText}`)

      return new Response(
        JSON.stringify({ 
          error: 'Gateway error', 
          status: response.status,
          statusText: response.statusText,
          details: errorText,
          timestamp: new Date().toISOString(),
          target_url: targetUrl,
          proxy_path: path,
          original_url: req.url
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseBody = await response.text().catch(() => '')
    console.log(`📄 Gateway response body:`, responseBody.substring(0, 300) + (responseBody.length > 300 ? '...' : ''))

    // Tentar parsear JSON, senão devolver como texto
    let parsedBody: unknown = null
    try {
      parsedBody = JSON.parse(responseBody)
    } catch {
      parsedBody = responseBody
    }

    return new Response(
      typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody),
      {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': typeof parsedBody === 'string' ? (response.headers.get('content-type') || 'text/plain') : 'application/json',
        }
      }
    )

  } catch (error: any) {
    console.error('❌ Proxy connection error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Proxy connection failed', 
        details: error?.message || String(error),
        timestamp: new Date().toISOString()
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})