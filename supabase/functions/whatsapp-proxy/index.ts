
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

// Função para testar conectividade com o gateway
async function testGatewayConnectivity(): Promise<any> {
  if (!parsedBase) {
    return {
      error: 'Invalid gateway base URL',
      gateway_url: GATEWAY_BASE_URL,
      origin: GATEWAY_ORIGIN,
      has_token: !!GATEWAY_TOKEN
    }
  }

  const tests = []
  const healthUrl = new URL('/health', parsedBase).toString()

  // Teste 1: Com Authorization + Origin
  console.log('🧪 Testing with Authorization + Origin...')
  try {
    const headers1: Record<string, string> = {
      'Origin': GATEWAY_ORIGIN,
      'User-Agent': 'Supabase-WhatsApp-Proxy-Debug/1.0'
    }
    if (GATEWAY_TOKEN) {
      headers1['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
    }

    const response1 = await fetch(healthUrl, { method: 'GET', headers: headers1 })
    const body1 = await response1.text().catch(() => '')
    
    tests.push({
      test: 'Authorization + Origin',
      status: response1.status,
      success: response1.ok,
      body: body1.substring(0, 500),
      headers_sent: headers1
    })
  } catch (error: any) {
    tests.push({
      test: 'Authorization + Origin',
      error: error.message,
      success: false
    })
  }

  // Teste 2: Só com Origin
  console.log('🧪 Testing with Origin only...')
  try {
    const headers2 = {
      'Origin': GATEWAY_ORIGIN,
      'User-Agent': 'Supabase-WhatsApp-Proxy-Debug/1.0'
    }

    const response2 = await fetch(healthUrl, { method: 'GET', headers: headers2 })
    const body2 = await response2.text().catch(() => '')
    
    tests.push({
      test: 'Origin only',
      status: response2.status,
      success: response2.ok,
      body: body2.substring(0, 500),
      headers_sent: headers2
    })
  } catch (error: any) {
    tests.push({
      test: 'Origin only',
      error: error.message,
      success: false
    })
  }

  // Teste 3: Só com Authorization
  if (GATEWAY_TOKEN) {
    console.log('🧪 Testing with Authorization only...')
    try {
      const headers3 = {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'User-Agent': 'Supabase-WhatsApp-Proxy-Debug/1.0'
      }

      const response3 = await fetch(healthUrl, { method: 'GET', headers: headers3 })
      const body3 = await response3.text().catch(() => '')
      
      tests.push({
        test: 'Authorization only',
        status: response3.status,
        success: response3.ok,
        body: body3.substring(0, 500),
        headers_sent: headers3
      })
    } catch (error: any) {
      tests.push({
        test: 'Authorization only',
        error: error.message,
        success: false
      })
    }
  }

  return {
    gateway_url: healthUrl,
    gateway_base: GATEWAY_BASE_URL,
    origin: GATEWAY_ORIGIN,
    has_token: !!GATEWAY_TOKEN,
    token_preview: GATEWAY_TOKEN ? `${GATEWAY_TOKEN.substring(0, 10)}...` : null,
    tests,
    timestamp: new Date().toISOString()
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

    // Endpoint de debug especial
    if (path === '/_debug') {
      console.log('🔍 Debug endpoint called')
      const debugResult = await testGatewayConnectivity()
      return new Response(JSON.stringify(debugResult, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Endpoint para testar QR stream (debug)
    if (path.startsWith('/_debug/peek-qr')) {
      console.log('🔍 QR Stream peek debug endpoint called')
      const connectionId = url.searchParams.get('connection_id')
      const tenantId = url.searchParams.get('tenant_id')
      
      if (!connectionId || !tenantId) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters',
          required: ['connection_id', 'tenant_id'],
          received: { connection_id: connectionId, tenant_id: tenantId }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      try {
        // Tentar ler apenas os primeiros bytes do stream QR
        const qrUrl = new URL(`/connections/${connectionId}/qr`, parsedBase!)
        qrUrl.searchParams.append('tenant_id', tenantId)
        
        console.log(`🎯 Testing QR stream: ${qrUrl.toString()}`)
        
        const gatewayHeaders: Record<string, string> = {
          'Origin': GATEWAY_ORIGIN,
          'User-Agent': 'Supabase-WhatsApp-Proxy-Debug/1.0',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
        
        if (GATEWAY_TOKEN) {
          gatewayHeaders['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
        }
        
        const response = await fetch(qrUrl.toString(), {
          method: 'GET',
          headers: gatewayHeaders,
          signal: AbortSignal.timeout(5000) // 5s timeout
        })
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          return new Response(JSON.stringify({
            status: response.status,
            error: `Gateway QR stream error: ${response.status}`,
            details: errorText.substring(0, 500),
            url: qrUrl.toString()
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        // Ler apenas os primeiros chunks
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader available')
        }
        
        let sampleData = ''
        let chunkCount = 0
        const maxChunks = 3
        
        try {
          while (chunkCount < maxChunks) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            sampleData += chunk
            chunkCount++
            
            // Se já temos dados suficientes, parar
            if (sampleData.length > 1000) break
          }
        } finally {
          reader.releaseLock()
        }
        
        return new Response(JSON.stringify({
          status: 200,
          success: true,
          chunks_read: chunkCount,
          sample_data: sampleData.substring(0, 1000),
          sample_length: sampleData.length,
          has_qr_pattern: sampleData.includes('qr') || sampleData.includes('QR'),
          has_event_stream: sampleData.includes('data:') || sampleData.includes('event:'),
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
        
      } catch (error: any) {
        console.error('❌ QR stream peek error:', error)
        return new Response(JSON.stringify({
          error: 'QR stream peek failed',
          details: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

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

    // SSE para QR codes e eventos (chats, mensagens, contatos)
    if ((path.includes('/qr') || path.includes('/events')) && req.method === 'GET') {
      console.log('🔄 Handling SSE request for:', path.includes('/qr') ? 'QR codes' : 'Events')
      gatewayHeaders['Accept'] = 'text/event-stream'
      gatewayHeaders['Cache-Control'] = 'no-cache'

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: gatewayHeaders,
      })

      console.log(`📡 SSE Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error(`❌ SSE Gateway error: ${response.status} - ${errorText}`)
        return new Response(
          JSON.stringify({ 
            error: 'SSE Gateway error', 
            status: response.status,
            statusText: response.statusText,
            details: errorText,
            timestamp: new Date().toISOString(),
            target_url: targetUrl
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            console.error('❌ No reader available for SSE stream')
            controller.close()
            return
          }
          async function pump() {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  console.log('✅ SSE stream completed')
                  break
                }
                controller.enqueue(value)
              }
              controller.close()
            } catch (error) {
              console.error('❌ SSE Stream error:', error)
              controller.error(error)
            }
          }
          pump()
        }
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // Requisições HTTP regulares
    const contentType = req.headers.get('content-type')
    if (contentType) {
      gatewayHeaders['Content-Type'] = contentType
    }

    const requestBody = req.method !== 'GET' && req.method !== 'HEAD' 
      ? await req.text() 
      : undefined

    console.log(`📤 Request headers to gateway:`, gatewayHeaders)
    if (requestBody) {
      console.log(`📄 Request body:`, requestBody.substring(0, 200) + (requestBody.length > 200 ? '...' : ''))
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: gatewayHeaders,
      body: requestBody,
    })

    console.log(`📥 Gateway response status: ${response.status}`)
    console.log(`📥 Gateway response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`❌ Gateway error response: ${response.status} - ${errorText}`)
      
      // FALLBACK: Se for POST /connections que falhou (500), tentar Supabase
      if (req.method === 'POST' && path === '/connections' && response.status >= 500) {
        console.log('🔄 Gateway connection creation failed, attempting Supabase fallback...')
        
        try {
          // Parsear dados da requisição
          const connectionData = requestBody ? JSON.parse(requestBody) : {}
          console.log('📋 Connection data from request:', connectionData)
          
          // Tentar criar no Supabase com autenticação do usuário
          const supabaseConnection = await createConnectionFallback(clientToken, clientApiKey, connectionData)
          
          console.log('✅ Fallback successful - returning Supabase connection')
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
