
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GATEWAY_BASE_URL = Deno.env.get('WHATSAPP_GATEWAY_URL') || 'https://evojuris-whatsapp.onrender.com'
const GATEWAY_TOKEN = Deno.env.get('WHATSAPP_GATEWAY_TOKEN')
const GATEWAY_ORIGIN_RAW = Deno.env.get('WHATSAPP_GATEWAY_ORIGIN') || 'https://evojuris-whatsapp.onrender.com'

// Clean origin - take only the first value if comma-separated
const GATEWAY_ORIGIN = GATEWAY_ORIGIN_RAW.split(',')[0].trim()

console.log(`Proxy configuration:`)
console.log(`- Gateway URL: ${GATEWAY_BASE_URL}`)
console.log(`- Gateway Origin (cleaned): ${GATEWAY_ORIGIN}`)
console.log(`- Has Token: ${!!GATEWAY_TOKEN}`)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders
    })
  }

  try {
    const url = new URL(req.url)
    
    // Extract path correctly - remove /functions/v1/whatsapp-proxy prefix
    let path = url.pathname
    const proxyPrefix = '/functions/v1/whatsapp-proxy'
    if (path.startsWith(proxyPrefix)) {
      path = path.substring(proxyPrefix.length)
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    
    const targetUrl = `${GATEWAY_BASE_URL}${path}${url.search}`

    console.log(`=== PROXY REQUEST ===`)
    console.log(`Original URL: ${req.url}`)
    console.log(`Extracted path: ${path}`)
    console.log(`Target URL: ${targetUrl}`)
    console.log(`Method: ${req.method}`)

    // Prepare headers for gateway request
    const gatewayHeaders: Record<string, string> = {
      'Origin': GATEWAY_ORIGIN,
      'User-Agent': 'Supabase-WhatsApp-Proxy/1.0'
    }

    // Add authorization if token is available
    if (GATEWAY_TOKEN) {
      gatewayHeaders['Authorization'] = `Bearer ${GATEWAY_TOKEN}`
      console.log('✅ Authorization header added')
    } else {
      console.log('⚠️ WARNING: No WHATSAPP_GATEWAY_TOKEN configured')
    }

    // Handle Server-Sent Events (SSE) for QR codes
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
        const errorText = await response.text()
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
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            }
          }
        )
      }

      // Create a new ReadableStream for SSE
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

    // Handle regular HTTP requests (GET, POST, etc.)
    // Copy relevant headers from original request
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
      const errorText = await response.text()
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
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      )
    }

    const responseBody = await response.text()
    console.log(`Gateway response body:`, responseBody.substring(0, 300) + (responseBody.length > 300 ? '...' : ''))
    
    // Parse JSON if possible, otherwise return as text
    let parsedBody
    try {
      parsedBody = JSON.parse(responseBody)
    } catch {
      parsedBody = responseBody
    }

    return new Response(JSON.stringify(parsedBody), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('❌ Proxy connection error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Proxy connection failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    )
  }
})
