import { supabase } from "@/integrations/supabase/client";

export type GatewayConnection = {
  id: string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | string;
  phone_number?: string | null;
  last_connected_at?: string | null;
};

export type GatewayEvent =
  | { type: 'qr'; data: string }
  | { type: 'status'; data: string }
  | { type: 'connected'; data?: any }
  | { type: 'disconnected'; data?: any }
  | { type: 'error'; data?: any }
  | { type: string; data?: any };

export type GatewayHealthStatus = {
  status: 'ok' | 'error';
  message: string;
  corsHeaders: boolean;
  timestamp: string;
  proxyUsed: boolean;
};

// Conexão direta com o servidor Render (sem proxy do Supabase)
const DIRECT_GATEWAY_BASE = "https://evojuris-whatsapp.onrender.com";
const GATEWAY_AUTH_TOKEN = "h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F";

// Usar conexão direta para evitar problemas com o proxy
const getBaseUrl = () => {
  return DIRECT_GATEWAY_BASE;
};

// QR stream também direto
const getQrStreamBaseUrl = () => {
  return DIRECT_GATEWAY_BASE;
};

const isUsingProxy = () => {
  return false;
};

// Incluir Authorization header para conexão direta
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${GATEWAY_AUTH_TOKEN}`
  };
  return headers;
};

// Helper function to safely handle JSON responses
const safeJsonResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { message: text };
      }
    }
  } else {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
};

// Ajuste: obter tenant_id via RPC e fallback em user_profiles
const getTenantId = async (): Promise<string> => {
  console.log('[whatsappGateway] Resolving tenant_id...');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // 1) Tentar via RPC get_user_session_info (já calcula o tenant_id correto)
  const { data: sessionInfo, error: sessionError } = await supabase.rpc('get_user_session_info');
  if (sessionError) {
    console.warn('[whatsappGateway] RPC get_user_session_info erro:', sessionError);
  } else if (sessionInfo && typeof sessionInfo === 'object' && 'tenant_id' in sessionInfo) {
    const tenant = (sessionInfo as any).tenant_id as string;
    console.log('[whatsappGateway] tenant_id via RPC:', tenant);
    if (tenant) return tenant;
  }

  // 2) Fallback: buscar parent_user_id em user_profiles; se existir, ele é o tenant
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('parent_user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.warn('[whatsappGateway] Fallback user_profiles erro:', profileError);
  }

  if (profile && profile.parent_user_id) {
    console.log('[whatsappGateway] tenant_id via parent_user_id:', profile.parent_user_id);
    return profile.parent_user_id;
  }

  // 3) Último fallback: o próprio user.id
  console.log('[whatsappGateway] Usando user.id como tenant_id:', user.id);
  return user.id;
};

// Export getTenantId function for external use
export { getTenantId };

export const whatsappGateway = {
  async testHealth(): Promise<GatewayHealthStatus> {
    const baseUrl = getBaseUrl();
    const proxyUsed = isUsingProxy();
    
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      const corsHeaders = res.headers.has('access-control-allow-origin');
      
      if (!res.ok) {
        const text = await res.text();
        return {
          status: 'error',
          message: `Health check failed: ${res.status} ${text.substring(0, 200)}`,
          corsHeaders,
          proxyUsed,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        status: 'ok',
        message: 'Gateway is healthy (direct connection)',
        corsHeaders,
        proxyUsed,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        corsHeaders: false,
        proxyUsed,
        timestamp: new Date().toISOString()
      };
    }
  },

  async listConnections(): Promise<GatewayConnection[]> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      // First, get connections from Supabase (these are the authoritative source)
      console.log('[whatsappGateway] 📋 Fetching connections from Supabase...');
      const { data: supabaseConnections, error: supabaseError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (supabaseError) {
        console.warn('[whatsappGateway] ⚠️ Failed to fetch from Supabase:', supabaseError);
        return [];
      }
      
      // Then, try to get connections from gateway to enrich the data
      let gatewayConnections: any[] = [];
      try {
        const url = new URL(`${baseUrl}/connections`);
        url.searchParams.append('tenant_id', tenantId);
        
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: getHeaders(),
        });
        
        if (res.ok) {
          const data = await safeJsonResponse(res);
          gatewayConnections = Array.isArray(data) ? data : (data?.connections ?? []);
          console.log('[whatsappGateway] 📋 Fetched connections from gateway:', gatewayConnections.length);
        } else {
          console.warn('[whatsappGateway] ⚠️ Gateway fetch failed:', res.status);
        }
      } catch (gatewayError) {
        console.warn('[whatsappGateway] ⚠️ Gateway not available:', gatewayError);
      }
      
      // Create a map of gateway connections for enrichment
      const gatewayMap = new Map();
      gatewayConnections.forEach(conn => {
        gatewayMap.set(conn.id, conn);
      });
      
      // Use ONLY Supabase connections as source of truth, enrich with gateway data when available
      const result: GatewayConnection[] = (supabaseConnections || []).map(conn => {
        const gatewayConn = gatewayMap.get(conn.id);
        return {
          id: conn.id,
          name: conn.name,
          status: gatewayConn?.status || conn.status, // Use gateway status if available
          phone_number: gatewayConn?.phone_number || conn.phone_number,
          last_connected_at: gatewayConn?.last_connected_at || conn.last_connected_at
        };
      });
      
      console.log('[whatsappGateway] 📋 Final connections list:', result.length, 'connections (Supabase only)');
      return result;
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão: Verifique se o gateway está ativo e configurado corretamente');
      }
      throw error;
    }
  },

  async createConnection(name: string): Promise<GatewayConnection> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      // Get current user for created_by_user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('[whatsappGateway] Attempting to create connection via gateway...');
      
      // Primeiro, tentar criar via POST no gateway
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...getHeaders(),
        };
        
        console.log('[whatsappGateway] Creating connection with gateway auth');
        
        const res = await fetch(`${baseUrl}/connections`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            name, 
            tenant_id: tenantId,
            created_by_user_id: user.id
          }),
        });
        
        if (res.ok) {
          const connection = await safeJsonResponse(res);
          console.log('[whatsappGateway] ✅ Connection created via gateway:', connection);
          
          // Ensure the connection is also saved in Supabase for consistency
          try {
            const { error: upsertError } = await supabase
              .from('whatsapp_connections')
              .upsert({
                id: connection.id,
                name: connection.name,
                tenant_id: tenantId,
                created_by_user_id: user.id,
                status: connection.status || 'disconnected',
                phone_number: connection.phone_number || null,
                last_connected_at: connection.last_connected_at || null
              });
            
            if (upsertError) {
              console.warn('[whatsappGateway] ⚠️ Failed to save connection to Supabase:', upsertError);
            } else {
              console.log('[whatsappGateway] ✅ Connection also saved to Supabase');
            }
          } catch (supabaseError) {
            console.warn('[whatsappGateway] ⚠️ Error saving to Supabase:', supabaseError);
          }
          
          return connection;
        } else {
          const errorData = await safeJsonResponse(res);
          console.warn('[whatsappGateway] ⚠️ Gateway creation failed:', res.status, errorData);
          throw new Error(`Gateway failed: ${res.status}`);
        }
      } catch (gatewayError) {
        console.warn('[whatsappGateway] ⚠️ Gateway creation failed, falling back to Supabase:', gatewayError);
        
        // Fallback: criar diretamente no Supabase
        console.log('[whatsappGateway] Creating connection directly in Supabase...');
        
        const { data: connection, error: supabaseError } = await supabase
          .from('whatsapp_connections')
          .insert({
            name,
            tenant_id: tenantId,
            created_by_user_id: user.id,
            phone_number: null, // evitar duplicidade; será atualizado após conexão
            status: 'disconnected'
          })
          .select()
          .single();
        
        if (supabaseError) {
          console.error('[whatsappGateway] ❌ Supabase insert error:', supabaseError);
          throw new Error(`Falha ao criar registro de conexão: ${supabaseError.message}`);
        }
        
        console.log('[whatsappGateway] ✅ Connection created successfully in Supabase (fallback):', connection);
        console.log('[whatsappGateway] ℹ️ Note: Connection registered only in database, not in gateway');
        
        // Map Supabase connection to GatewayConnection format
        return {
          id: connection.id,
          name: connection.name,
          status: connection.status,
          phone_number: connection.phone_number,
          last_connected_at: connection.last_connected_at
        };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ createConnection error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao criar conexão');
    }
  },

  async connect(connectionId: string): Promise<void> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getHeaders(),
      };
      
      console.log('[whatsappGateway] 🔗 Trying to connect existing connection:', {
        connectionId,
        tenantId,
        hasGatewayAuth: !!GATEWAY_AUTH_TOKEN
      });
      
      // Try multiple connect endpoints in order of preference
      const endpoints = [
        `/connections/${connectionId}/connect`,
        `/connections/${connectionId}/start`,
        `/connection/${connectionId}/connect`,
        `/connection/${connectionId}/start`,
        `/sessions/${connectionId}/start`,
        `/session/${connectionId}/start`
      ];
      
      let lastError: string = '';
      
      for (const endpoint of endpoints) {
        try {
          const url = new URL(`${baseUrl}${endpoint}`);
          url.searchParams.append('tenant_id', tenantId);
          
          console.log('[whatsappGateway] 🎯 Trying endpoint:', endpoint);
          
          const res = await fetch(url.toString(), {
            method: 'POST',
            headers,
          });
          
          if (res.ok) {
            console.log('[whatsappGateway] ✅ Connection initiated successfully via:', endpoint);
            return;
          }
          
          const errorData = await safeJsonResponse(res);
          lastError = `${res.status} - ${JSON.stringify(errorData)}`;
          
          // 404 means endpoint doesn't exist, try next one
          if (res.status === 404) {
            console.log('[whatsappGateway] 🔄 Endpoint not found:', endpoint, 'trying next...');
            continue;
          }
          
          // Other errors might indicate the endpoint exists but failed
          console.warn('[whatsappGateway] ⚠️ Endpoint failed:', endpoint, res.status, errorData);
          
        } catch (fetchError) {
          console.warn('[whatsappGateway] ⚠️ Fetch error for:', endpoint, fetchError);
          lastError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
        }
      }
      
      // All endpoints failed, but this is OK - some gateways don't need explicit connect
      console.log('[whatsappGateway] ℹ️ All connect endpoints failed, but proceeding - QR stream might work directly');
      console.log('[whatsappGateway] ℹ️ Last error was:', lastError);
      
      // Don't throw error here - let QR stream handle the connection
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ connect error:', error);
      // Don't throw - let QR stream try to handle it
      console.log('[whatsappGateway] ℹ️ Connect failed but proceeding with QR stream');
    }
  },

  openQrStream(connectionId: string, onEvent: (evt: GatewayEvent) => void) {
    const baseUrl = getQrStreamBaseUrl();
    let eventSource: EventSource | null = null;
    let abortController: AbortController | null = null;
    
    const startStream = async () => {
      try {
        const tenantId = await getTenantId();
        
        console.log('[whatsappGateway] 🔐 Auth info for QR stream:', {
          hasGatewayToken: !!GATEWAY_AUTH_TOKEN,
          tenantId,
          connectionId
        });
        
        // Try multiple QR endpoints with different parameters
        const qrEndpoints = [
          { path: `/connections/${connectionId}/qr`, params: { start: '1' } },
          { path: `/connections/${connectionId}/qr`, params: {} },
          { path: `/connection/${connectionId}/qr`, params: { start: '1' } },
          { path: `/connection/${connectionId}/qr`, params: {} },
        ];
        
        let streamStarted = false;
        
        for (const { path, params } of qrEndpoints) {
          if (streamStarted) break;
          
          // Try EventSource first (native SSE support)
          try {
            console.log('[whatsappGateway] 🎯 Trying EventSource for QR stream:', path, params);
            
            const url = new URL(`${baseUrl}${path}`);
            url.searchParams.append('tenant_id', tenantId);
            url.searchParams.append('token', GATEWAY_AUTH_TOKEN);
            url.searchParams.append('auth', GATEWAY_AUTH_TOKEN);
            url.searchParams.append('access_token', GATEWAY_AUTH_TOKEN);
            
            // Add additional parameters
            Object.entries(params).forEach(([key, value]) => {
              url.searchParams.append(key, value);
            });
            
            eventSource = new EventSource(url.toString());
            
            let eventSourceTimeout: NodeJS.Timeout | null = setTimeout(() => {
              console.warn('[whatsappGateway] ⏰ EventSource timeout, falling back to fetch');
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
            }, 3000);
            
            eventSource.onopen = () => {
              console.log('[whatsappGateway] ✅ QR EventSource connected:', path);
              streamStarted = true;
              if (eventSourceTimeout) {
                clearTimeout(eventSourceTimeout);
                eventSourceTimeout = null;
              }
            };
            
            eventSource.onmessage = (event) => {
              try {
                const parsedData = JSON.parse(event.data);
                
                // Check for QR code in different formats
                const qrData = parsedData.qr || parsedData.qr_code || parsedData.qrcode || parsedData.qrCode;
                
                if (qrData) {
                  console.log('[whatsappGateway] 📱 QR code received via EventSource');
                  onEvent({ type: 'qr', data: qrData });
                } else if (parsedData.type) {
                  console.log('[whatsappGateway] 📨 QR EventSource event:', parsedData.type);
                  onEvent(parsedData as GatewayEvent);
                } else {
                  console.log('[whatsappGateway] 📨 QR EventSource message');
                  onEvent({ type: 'message', data: parsedData });
                }
              } catch (parseError) {
                console.log('[whatsappGateway] 📨 QR EventSource raw message:', event.data.substring(0, 100));
                onEvent({ type: 'message', data: event.data });
              }
            };
            
            eventSource.onerror = (error) => {
              console.warn('[whatsappGateway] ⚠️ EventSource error, trying fetch fallback:', error);
              if (eventSourceTimeout) {
                clearTimeout(eventSourceTimeout);
                eventSourceTimeout = null;
              }
              if (eventSource) {
                eventSource.close();
                eventSource = null;
              }
            };
            
            // Wait a bit to see if EventSource works
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (streamStarted && eventSource && eventSource.readyState === EventSource.OPEN) {
              console.log('[whatsappGateway] ✅ QR EventSource working, keeping connection');
              return;
            }
            
          } catch (eventSourceError) {
            console.warn('[whatsappGateway] ⚠️ EventSource failed, trying fetch fallback:', eventSourceError);
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }
          
          // Fetch fallback with Authorization header
          try {
            console.log('[whatsappGateway] 🔄 Trying fetch fallback for QR stream:', path, params);
            
            abortController = new AbortController();
            
            const url = new URL(`${baseUrl}${path}`);
            url.searchParams.append('tenant_id', tenantId);
            
            // Add additional parameters
            Object.entries(params).forEach(([key, value]) => {
              url.searchParams.append(key, value);
            });
            
            const headers = {
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Authorization': `Bearer ${GATEWAY_AUTH_TOKEN}`,
            };
            
            const response = await fetch(url.toString(), {
              method: 'GET',
              headers,
              signal: abortController.signal,
            });
            
            if (response.status === 401 || response.status === 403) {
              console.error('[whatsappGateway] ❌ Authentication failed for QR stream');
              onEvent({ type: 'error', data: 'Falha de autenticação no stream - verifique o token' });
              return;
            }
            
            if (!response.ok) {
              if (response.status === 404) {
                console.log('[whatsappGateway] 🔄 QR endpoint not found:', path, 'trying next...');
                continue;
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (!response.body) {
              throw new Error('No response body for SSE stream');
            }
            
            streamStarted = true;
            console.log('[whatsappGateway] ✅ QR fetch stream started with:', path);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            const processSSEData = (chunk: string) => {
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.startsWith('event:')) {
                  continue;
                }
                
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.substring(5).trim();
                  
                  try {
                    const parsedData = JSON.parse(data);
                    
                    const qrData = parsedData.qr || parsedData.qr_code || parsedData.qrcode || parsedData.qrCode;
                    
                    if (qrData) {
                      console.log('[whatsappGateway] 📱 QR code received via fetch stream');
                      onEvent({ type: 'qr', data: qrData });
                    } else if (parsedData.type) {
                      console.log('[whatsappGateway] 📨 QR fetch stream event:', parsedData.type);
                      onEvent(parsedData as GatewayEvent);
                    } else {
                      console.log('[whatsappGateway] 📨 QR fetch stream message');
                      onEvent({ type: 'message', data: parsedData });
                    }
                  } catch (parseError) {
                    console.log('[whatsappGateway] 📨 QR fetch stream raw message:', data.substring(0, 100));
                    onEvent({ type: 'message', data });
                  }
                }
              }
            };
            
            // Process stream
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log('[whatsappGateway] ✅ QR fetch stream completed');
                break;
              }
              
              buffer += decoder.decode(value, { stream: true });
              
              const messageEnd = buffer.indexOf('\n\n');
              if (messageEnd !== -1) {
                const message = buffer.substring(0, messageEnd);
                buffer = buffer.substring(messageEnd + 2);
                
                processSSEData(message);
              }
            }
            
          } catch (fetchError) {
            console.warn('[whatsappGateway] ⚠️ Fetch fallback error for endpoint:', path, fetchError);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              return;
            }
          }
        }
        
        if (!streamStarted) {
          console.error('[whatsappGateway] ❌ All QR stream methods failed');
          onEvent({ type: 'error', data: 'Não foi possível conectar ao stream de QR' });
        }
        
      } catch (error) {
        console.error('[whatsappGateway] ❌ QR stream error:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        onEvent({ type: 'error', data: error instanceof Error ? error.message : 'Erro inesperado no stream QR' });
      }
    };
    
    // Start the stream
    startStream();
    
    // Return close function
    return {
      close: () => {
        if (eventSource) {
          console.log('[whatsappGateway] 🔐 Closing QR EventSource');
          eventSource.close();
          eventSource = null;
        }
        if (abortController) {
          console.log('[whatsappGateway] 🔐 Closing QR fetch stream');
          abortController.abort();
          abortController = null;
        }
      }
    };
  },

  async updateConnection(connectionId: string, updates: { name?: string }): Promise<GatewayConnection> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      // Try updating via gateway first
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const clientToken = session?.access_token;
        const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...getHeaders(),
        };
        
        if (clientToken) {
          headers['Authorization'] = `Bearer ${clientToken}`;
        }
        if (clientApiKey) {
          headers['apikey'] = clientApiKey;
        }
        
        const url = new URL(`${baseUrl}/connections/${connectionId}`);
        url.searchParams.append('tenant_id', tenantId);
        
        const res = await fetch(url.toString(), {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates),
        });
        
        if (res.ok) {
          const connection = await safeJsonResponse(res);
          console.log('[whatsappGateway] ✅ Connection updated via gateway:', connection);
          return connection;
        } else {
          console.warn('[whatsappGateway] ⚠️ Gateway update failed, falling back to Supabase');
          throw new Error(`Gateway failed: ${res.status}`);
        }
      } catch (gatewayError) {
        console.warn('[whatsappGateway] ⚠️ Gateway update failed, falling back to Supabase:', gatewayError);
        
        // Fallback: update directly in Supabase
        const { data: connection, error: supabaseError } = await supabase
          .from('whatsapp_connections')
          .update(updates)
          .eq('id', connectionId)
          .eq('tenant_id', tenantId)
          .select()
          .single();
        
        if (supabaseError) {
          throw new Error(`Falha ao atualizar conexão: ${supabaseError.message}`);
        }
        
        console.log('[whatsappGateway] ✅ Connection updated in Supabase (fallback):', connection);
        
        return {
          id: connection.id,
          name: connection.name,
          status: connection.status,
          phone_number: connection.phone_number,
          last_connected_at: connection.last_connected_at
        };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ updateConnection error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao atualizar conexão');
    }
  },

  async deleteConnection(connectionId: string): Promise<void> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🗑️ Starting robust connection deletion:', {
        connectionId,
        tenantId
      });
      
      // Try deleting via gateway first - this should handle most cleanup
      try {
        const headers: Record<string, string> = {
          ...getHeaders(),
        };
        
        const url = new URL(`${baseUrl}/connections/${connectionId}`);
        url.searchParams.append('tenant_id', tenantId);
        url.searchParams.append('force', 'true'); // Force deletion
        
        const res = await fetch(url.toString(), {
          method: 'DELETE',
          headers,
        });
        
        if (res.ok) {
          console.log('[whatsappGateway] ✅ Connection deleted via gateway (robust cleanup)');
        } else {
          console.warn('[whatsappGateway] ⚠️ Gateway delete failed, continuing with Supabase cleanup');
          throw new Error(`Gateway failed: ${res.status}`);
        }
      } catch (gatewayError) {
        console.warn('[whatsappGateway] ⚠️ Gateway delete failed, performing manual cleanup:', gatewayError);
      }
      
      // Always perform Supabase cleanup to ensure everything is removed
      console.log('[whatsappGateway] 🧹 Performing comprehensive Supabase cleanup...');
      
      // Delete all related data in proper order (children first, then parent)
      
      // 1. Delete messages first
      try {
        const { error: messagesError } = await supabase
          .from('whatsapp_messages')
          .delete()
          .eq('connection_id', connectionId)
          .eq('tenant_id', tenantId);
        
        if (messagesError) {
          console.warn('[whatsappGateway] ⚠️ Error deleting messages:', messagesError);
        } else {
          console.log('[whatsappGateway] ✅ WhatsApp messages deleted');
        }
      } catch (e) {
        console.warn('[whatsappGateway] ⚠️ Messages deletion failed:', e);
      }
      
      // 2. Delete chats
      try {
        const { error: chatsError } = await supabase
          .from('whatsapp_chats')
          .delete()
          .eq('connection_id', connectionId)
          .eq('tenant_id', tenantId);
        
        if (chatsError) {
          console.warn('[whatsappGateway] ⚠️ Error deleting chats:', chatsError);
        } else {
          console.log('[whatsappGateway] ✅ WhatsApp chats deleted');
        }
      } catch (e) {
        console.warn('[whatsappGateway] ⚠️ Chats deletion failed:', e);
      }
      
      // 3. Delete contacts
      try {
        const { error: contactsError } = await supabase
          .from('whatsapp_contacts')
          .delete()
          .eq('connection_id', connectionId)
          .eq('tenant_id', tenantId);
        
        if (contactsError) {
          console.warn('[whatsappGateway] ⚠️ Error deleting contacts:', contactsError);
        } else {
          console.log('[whatsappGateway] ✅ WhatsApp contacts deleted');
        }
      } catch (e) {
        console.warn('[whatsappGateway] ⚠️ Contacts deletion failed:', e);
      }
      
      // 4. Delete sessions
      try {
        const { error: sessionsError } = await supabase
          .from('whatsapp_sessions')
          .delete()
          .eq('connection_id', connectionId);
        
        if (sessionsError) {
          console.warn('[whatsappGateway] ⚠️ Error deleting sessions:', sessionsError);
        } else {
          console.log('[whatsappGateway] ✅ WhatsApp sessions deleted');
        }
      } catch (e) {
        console.warn('[whatsappGateway] ⚠️ Sessions deletion failed:', e);
      }
      
      // 5. Finally delete the connection itself
      const { error: connectionError } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId)
        .eq('tenant_id', tenantId);
      
      if (connectionError) {
        throw new Error(`Falha ao excluir conexão: ${connectionError.message}`);
      }
      
      console.log('[whatsappGateway] ✅ Connection and all related data deleted successfully');
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ deleteConnection error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao excluir conexão');
    }
  },

  // Open events stream for real-time WhatsApp data (chats, messages, contacts)
  openEventsStream(connectionId: string, onEvent: (evt: GatewayEvent) => void): { close: () => void } {
    console.log('[whatsappGateway] 🔄 Opening events stream for connection:', connectionId);
    
    let eventSource: EventSource | null = null;
    let abortController: AbortController | null = null;
    
    const startStream = async () => {
      try {
        const baseUrl = getQrStreamBaseUrl();
        const tenantId = await getTenantId();
        
        console.log('[whatsappGateway] 🔐 Events auth info:', {
          hasGatewayToken: !!GATEWAY_AUTH_TOKEN,
          tenantId,
          connectionId
        });
        
        // Try EventSource first (native SSE support)
        try {
          console.log('[whatsappGateway] 🎯 Trying EventSource for events stream');
          
          const url = new URL(`${baseUrl}/connections/${connectionId}/events`);
          url.searchParams.append('tenant_id', tenantId);
          url.searchParams.append('token', GATEWAY_AUTH_TOKEN);
          url.searchParams.append('auth', GATEWAY_AUTH_TOKEN);
          url.searchParams.append('access_token', GATEWAY_AUTH_TOKEN);
          
          eventSource = new EventSource(url.toString());
          
          let eventSourceTimeout: NodeJS.Timeout | null = setTimeout(() => {
            console.warn('[whatsappGateway] ⏰ Events EventSource timeout, falling back to fetch');
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }, 3000);
          
          let streamConnected = false;
          
          eventSource.onopen = () => {
            console.log('[whatsappGateway] ✅ Events EventSource connected');
            streamConnected = true;
            onEvent({ type: 'status', data: 'Events stream connected via EventSource' });
            if (eventSourceTimeout) {
              clearTimeout(eventSourceTimeout);
              eventSourceTimeout = null;
            }
          };
          
          eventSource.onmessage = (event) => {
            try {
              const parsedData = JSON.parse(event.data);
              
              if (parsedData.type) {
                console.log('[whatsappGateway] 📨 Events EventSource event:', parsedData.type);
                onEvent(parsedData as GatewayEvent);
              } else {
                onEvent({ type: 'message', data: parsedData });
              }
            } catch (parseError) {
              console.log('[whatsappGateway] 📨 Events EventSource raw message:', event.data.substring(0, 100));
              onEvent({ type: 'message', data: event.data });
            }
          };
          
          eventSource.onerror = (error) => {
            console.warn('[whatsappGateway] ⚠️ Events EventSource error, trying fetch fallback:', error);
            if (eventSourceTimeout) {
              clearTimeout(eventSourceTimeout);
              eventSourceTimeout = null;
            }
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          };
          
          // Wait to see if EventSource works
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (streamConnected && eventSource && eventSource.readyState === EventSource.OPEN) {
            console.log('[whatsappGateway] ✅ Events EventSource working, keeping connection');
            return;
          }
          
        } catch (eventSourceError) {
          console.warn('[whatsappGateway] ⚠️ Events EventSource failed, trying fetch fallback:', eventSourceError);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
        }
        
        // Fetch fallback
        console.log('[whatsappGateway] 🔄 Trying fetch fallback for events stream');
        
        abortController = new AbortController();
        
        const url = new URL(`${baseUrl}/connections/${connectionId}/events`);
        url.searchParams.append('tenant_id', tenantId);
        
        const headers = {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${GATEWAY_AUTH_TOKEN}`,
        };

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: abortController.signal,
        });
        
        if (response.status === 401 || response.status === 403) {
          console.error('[whatsappGateway] ❌ Authentication failed for events stream');
          onEvent({ type: 'error', data: 'Falha de autenticação no stream - verifique o token' });
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!response.body) {
          throw new Error('No response body for SSE stream');
        }
        
        console.log('[whatsappGateway] ✅ Events fetch stream connected successfully');
        onEvent({ type: 'status', data: 'Events stream connected via fetch' });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const processSSEData = (chunk: string) => {
          const lines = chunk.split('\n');
          let eventType = '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            if (trimmed.startsWith('event:')) {
              eventType = trimmed.substring(6).trim();
              continue;
            }
            
            if (trimmed.startsWith('data:')) {
              const data = trimmed.substring(5).trim();
              
              try {
                const parsedData = JSON.parse(data);
                
                if (parsedData.type) {
                  console.log('[whatsappGateway] 📨 Events fetch stream event:', parsedData.type);
                  onEvent(parsedData as GatewayEvent);
                } else if (eventType) {
                  console.log('[whatsappGateway] 📨 Events fetch stream event:', eventType);
                  onEvent({ type: eventType, data: parsedData });
                } else {
                  onEvent({ type: 'message', data: parsedData });
                }
              } catch (parseError) {
                console.log('[whatsappGateway] 📨 Events fetch stream raw message:', data.substring(0, 100));
                if (eventType) {
                  onEvent({ type: eventType, data });
                } else {
                  onEvent({ type: 'message', data });
                }
              }
              
              eventType = '';
            }
          }
        };
        
        // Process stream
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[whatsappGateway] ✅ Events fetch stream completed');
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const messageEnd = buffer.indexOf('\n\n');
          if (messageEnd !== -1) {
            const message = buffer.substring(0, messageEnd);
            buffer = buffer.substring(messageEnd + 2);
            
            processSSEData(message);
          }
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[whatsappGateway] 🔐 Events stream aborted');
          return;
        }
        console.error('[whatsappGateway] ❌ Events stream error:', error);
        onEvent({ type: 'error', data: error instanceof Error ? error.message : 'Erro inesperado no stream de eventos' });
      }
    };
    
    // Start the stream
    startStream();
    
    // Return close function
    return {
      close: () => {
        if (eventSource) {
          console.log('[whatsappGateway] 🔐 Closing events EventSource');
          eventSource.close();
          eventSource = null;
        }
        if (abortController) {
          console.log('[whatsappGateway] 🔐 Closing events fetch stream');
          abortController.abort();
          abortController = null;
        }
      }
    };
  },

  // Send text message via WhatsApp
  async sendText(connectionId: string, to: string, text: string): Promise<any> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getHeaders(),
      };
      
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      const url = new URL(`${baseUrl}/connections/${connectionId}/send`);
      url.searchParams.append('tenant_id', tenantId);
      
      const messageData = {
        to,
        type: 'text',
        text: { body: text }
      };
      
      console.log('[whatsappGateway] 📤 Sending text message:', { to, text: text.substring(0, 50) });
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(messageData),
      });
      
      if (!res.ok) {
        const errorData = await safeJsonResponse(res);
        console.error('[whatsappGateway] ❌ Send message error:', res.status, errorData);
        throw new Error(`Falha ao enviar mensagem: ${res.status} - ${JSON.stringify(errorData)}`);
      }
      
      const result = await safeJsonResponse(res);
      console.log('[whatsappGateway] ✅ Message sent successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ sendText error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao enviar mensagem');
    }
  },

  // Bootstrap sync for initial data fetch
  async bootstrapSync(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const baseUrl = getBaseUrl();
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔄 Starting bootstrap sync for connection:', connectionId);
      
      const url = new URL(`${baseUrl}/bootstrap`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Bootstrap sync failed: ${response.status}`);
      }
      
      const result = await safeJsonResponse(response);
      console.log('[whatsappGateway] ✅ Bootstrap sync completed:', result);
      
      return result;
    } catch (error) {
      console.error('[whatsappGateway] ❌ Bootstrap sync error:', error);
      throw error;
    }
  },

  // Force reset connection session - tries to clear stuck sessions
  forceResetConnection: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      // Get authentication
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authentication headers
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      console.log('[whatsappGateway] 💥 Force resetting connection session:', connectionId);
      
      const url = new URL(`${baseUrl}/force-reset-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
      });
      
      const data = await safeJsonResponse(res);
      
      if (res.ok && data.success) {
        console.log('[whatsappGateway] ✅ Force reset completed successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        console.warn('[whatsappGateway] ⚠️ Force reset had issues:', data.message);
        return { success: false, message: data.message || 'Force reset failed' };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ forceResetConnection error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error during force reset'
      };
    }
  },

  // Refresh connection info
  async refreshConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔄 Refreshing connection:', connectionId);
      
      const url = new URL(`${baseUrl}/refresh-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: getHeaders(),
      });
      
      const data = await safeJsonResponse(res);
      
      if (res.ok && data.success) {
        console.log('[whatsappGateway] ✅ Connection refreshed successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        console.warn('[whatsappGateway] ⚠️ Connection refresh had issues:', data.message);
        return { success: false, message: data.message || 'Connection refresh failed' };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ refreshConnection error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error during connection refresh'
      };
    }
  },

  // Restart a WhatsApp connection
  async restartConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔄 Restarting connection:', connectionId);
      
      const url = new URL(`${baseUrl}/restart-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: getHeaders(),
      });
      
      const data = await safeJsonResponse(res);
      
      if (res.ok && data.success) {
        console.log('[whatsappGateway] ✅ Connection restarted successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        console.warn('[whatsappGateway] ⚠️ Connection restart had issues:', data.message);
        return { success: false, message: data.message || 'Connection restart failed' };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ restartConnection error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error during connection restart'
      };
    }
  },

  // Disconnect a WhatsApp connection
  async disconnectConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = getBaseUrl();
    
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔌 Disconnecting connection:', connectionId);
      
      const url = new URL(`${baseUrl}/disconnect-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: getHeaders(),
      });
      
      const data = await safeJsonResponse(res);
      
      if (res.ok && data.success) {
        console.log('[whatsappGateway] ✅ Connection disconnected successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        console.warn('[whatsappGateway] ⚠️ Connection disconnect had issues:', data.message);
        return { success: false, message: data.message || 'Connection disconnect failed' };
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ disconnectConnection error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error during connection disconnect'
      };
    }
  }
};
