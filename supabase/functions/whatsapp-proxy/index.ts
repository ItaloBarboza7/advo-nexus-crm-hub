
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Carregar e validar variáveis de ambiente
const RAW_BASE = Deno.env.get('WHATSAPP_GATEWAY_URL')?.trim()
const GATEWAY_BASE_URL = RAW_BASE && RAW_BASE !== '' ? RAW_BASE : 'https://evojuris-whatsapp.onrender.com'
const GATEWAY_TOKEN = Deno.env.get('WHATSAPP_GATEWAY_TOKEN')
const GATEWAY_ORIGIN_RAW = Deno.env.get('WHATSAPP_GATEWAY_ORIGIN') || GATEWAY_BASE_URL

// Limpar origin - pegar apenas o primeiro valor se vier separado por vírgula
const GATEWAY_ORIGIN = GATEWAY_ORIGIN_RAW.split(',')[0].trim()

// Validar URL base
let parsedBase: URL | null = null
try {
  parsedBase = new URL(GATEWAY_BASE_URL.endsWith('/') ? GATEWAY_BASE_URL : GATEWAY_BASE_URL + '/')
} catch {
  console.error("❌ Invalid WHATSAPP_GATEWAY_URL:", GATEWAY_BASE_URL)
}

console.log(`🔧 Proxy configuration:`)
console.log(`- Gateway URL: ${parsedBase ? parsedBase.toString() : 'INVALID'}`)
console.log(`- Gateway Origin (cleaned): ${GATEWAY_ORIGIN}`)
console.log(`- Has Token: ${!!GATEWAY_TOKEN}`)

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

    console.log(`🔄 PROXY REQUEST:`)
    console.log(`- Original URL: ${req.url}`)
    console.log(`- Raw path: ${rawPath}`)
    console.log(`- Normalized path: ${path}`)
    console.log(`- Method: ${req.method}`)

    // Endpoint de debug especial
    if (path === '/_debug') {
      console.log('🔍 Debug endpoint called')
      const debugResult = await testGatewayConnectivity()
      return new Response(JSON.stringify(debugResult, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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

    // Preparar headers para o gateway
    const gatewayHeaders: Record<string, string> = {
      'Origin': GATEWAY_ORIGIN,
      'User-Agent': 'Supabase-WhatsApp-Proxy/1.2'
    }

    if (GATEWAY_TOKEN) {
      gatewayHeaders['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
      console.log('✅ Authorization header added')
    } else {
      console.log('⚠️ WARNING: No WHATSAPP_GATEWAY_TOKEN configured')
    }

    // SSE para QR codes
    if (path.includes('/qr') && req.method === 'GET') {
      console.log('🔄 Handling SSE request for QR codes')
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
