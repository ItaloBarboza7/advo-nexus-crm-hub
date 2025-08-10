
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GATEWAY_BASE_URL = Deno.env.get('WHATSAPP_GATEWAY_URL') || 'https://evojuris-whatsapp.onrender.com'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders
    })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/whatsapp-proxy', '')
    const targetUrl = `${GATEWAY_BASE_URL}${path}${url.search}`

    console.log(`Proxying request: ${req.method} ${targetUrl}`)

    // Handle Server-Sent Events (SSE) for QR codes
    if (path.includes('/qr') && req.method === 'GET') {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        console.error(`SSE Gateway error: ${response.status} - ${response.statusText}`)
        return new Response(
          JSON.stringify({ 
            error: 'SSE Gateway error', 
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
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
            controller.close()
            return
          }

          async function pump() {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                controller.enqueue(value)
              }
              controller.close()
            } catch (error) {
              console.error('SSE Stream error:', error)
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
    const headers: Record<string, string> = {}
    
    // Copy relevant headers from original request
    const contentType = req.headers.get('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    // For requests that need authentication, we could forward auth headers
    // but for this gateway, we'll make all requests without auth since
    // the gateway itself doesn't require auth for basic endpoints
    
    const requestBody = req.method !== 'GET' && req.method !== 'HEAD' 
      ? await req.text() 
      : undefined

    console.log(`Making request to gateway: ${req.method} ${targetUrl}`)
    console.log(`Request headers:`, headers)
    if (requestBody) {
      console.log(`Request body:`, requestBody)
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    })

    console.log(`Gateway response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gateway error response: ${response.status} - ${errorText}`)
      
      return new Response(
        JSON.stringify({ 
          error: 'Gateway error', 
          status: response.status,
          statusText: response.statusText,
          details: errorText,
          timestamp: new Date().toISOString()
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
    console.log(`Gateway response body:`, responseBody)
    
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
    console.error('Proxy error:', error)
    
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
