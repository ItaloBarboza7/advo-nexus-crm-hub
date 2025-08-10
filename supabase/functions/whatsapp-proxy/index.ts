
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
  // Não lançamos aqui para permitir resposta amigável no handler
}

console.log(`Proxy configuration:`)
console.log(`- Gateway URL: ${parsedBase ? parsedBase.toString() : 'INVALID'}`)
console.log(`- Gateway Origin (cleaned): ${GATEWAY_ORIGIN}`)
console.log(`- Has Token: ${!!GATEWAY_TOKEN}`)

// Utilitário: normalizar o path removendo prefixos do proxy
function normalizeProxyPath(pathname: string): string {
  const prefixes = [
    '/functions/v1/whatsapp-proxy',
    '/whatsapp-proxy',
  ]
  let out = pathname
  for (const prefix of prefixes) {
    if (out.startsWith(prefix)) {
      out = out.substring(prefix.length)
      break
    }
  }
  if (!out.startsWith('/')) out = '/' + out
  return out
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders
    })
  }

  try {
    // Validar base antes de prosseguir
    if (!parsedBase) {
      return new Response(
        JSON.stringify({
          error: 'Proxy encountered an error',
          details: `Invalid WHATSAPP_GATEWAY_URL: "${GATEWAY_BASE_URL}"`,
          hint: 'Configure o secret WHATSAPP_GATEWAY_URL com uma URL válida (ex.: https://evojuris-whatsapp.onrender.com)',
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)

    // Extrair e normalizar caminho (remove prefixos do proxy)
    const rawPath = url.pathname
    let path = normalizeProxyPath(rawPath)

    // Construir URL alvo de forma segura
    let targetUrl: string
    try {
      const target = new URL(path + url.search, parsedBase)
      targetUrl = target.toString()
    } catch (e) {
      console.error("❌ Failed to build target URL:", e)
      return new Response(
        JSON.stringify({
          error: 'Proxy encountered an error',
          details: `Invalid URL: base="${parsedBase.toString()}" path="${path}" search="${url.search}"`,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`=== PROXY REQUEST ===`)
    console.log(`Original URL: ${req.url}`)
    console.log(`Extracted path: ${path}`)
    console.log(`Target URL: ${targetUrl}`)
    console.log(`Method: ${req.method}`)

    // Preparar headers para o gateway
    const gatewayHeaders: Record<string, string> = {
      'Origin': GATEWAY_ORIGIN,
      'User-Agent': 'Supabase-WhatsApp-Proxy/1.1'
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
      console.log(`SSE Headers:`, gatewayHeaders)

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: gatewayHeaders,
      })

      console.log(`SSE Response status: ${response.status}`)

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

    console.log(`Request headers to gateway:`, gatewayHeaders)
    if (requestBody) {
      console.log(`Request body:`, requestBody.substring(0, 200) + (requestBody.length > 200 ? '...' : ''))
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: gatewayHeaders,
      body: requestBody,
    })

    console.log(`✅ Gateway response status: ${response.status}`)
    console.log(`Gateway response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`❌ Gateway error response: ${response.status} - ${errorText}`)
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
    console.log(`Gateway response body:`, responseBody.substring(0, 300) + (responseBody.length > 300 ? '...' : ''))

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
