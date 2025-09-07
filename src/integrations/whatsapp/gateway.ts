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
          const data = await res.json();
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
          const connection = await res.json();
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
          const text = await res.text();
          console.warn('[whatsappGateway] ⚠️ Gateway creation failed:', res.status, text);
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
          
          const text = await res.text();
          lastError = `${res.status} - ${text}`;
          
          // 404 means endpoint doesn't exist, try next one
          if (res.status === 404) {
            console.log('[whatsappGateway] 🔄 Endpoint not found:', endpoint, 'trying next...');
            continue;
          }
          
          // Other errors might indicate the endpoint exists but failed
          console.warn('[whatsappGateway] ⚠️ Endpoint failed:', endpoint, res.status, text);
          
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
          
          try {
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
            
            console.log('[whatsappGateway] 🎯 Trying QR stream:', path, params);

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
            console.log('[whatsappGateway] ✅ QR stream started with:', path);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            const processSSEData = (chunk: string) => {
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.startsWith('event:')) {
                  // Extract event type
                  continue;
                }
                
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.substring(5).trim();
                  
                  try {
                    const parsedData = JSON.parse(data);
                    
                    // Check for QR code in different formats
                    const qrData = parsedData.qr || parsedData.qr_code || parsedData.qrcode || parsedData.qrCode;
                    if (qrData && typeof qrData === 'string') {
                      console.log('[whatsappGateway] 🎯 QR code found in JSON data');
                      onEvent({ type: 'qr', data: qrData });
                    } else if (parsedData.status) {
                      console.log('[whatsappGateway] 📊 Status update from JSON:', parsedData.status);
                      onEvent({ type: 'status', data: parsedData.status });
                    } else if (parsedData.type === 'connected') {
                      console.log('[whatsappGateway] ✅ Connected event from JSON');
                      onEvent({ type: 'connected', data: parsedData });
                    } else if (parsedData.type === 'disconnected') {
                      console.log('[whatsappGateway] ❌ Disconnected event from JSON');
                      onEvent({ type: 'disconnected', data: parsedData });
                    } else if (parsedData.error) {
                      console.log('[whatsappGateway] ❌ Error event from JSON:', parsedData.error);
                      onEvent({ type: 'error', data: parsedData.error });
                    } else {
                      console.log('[whatsappGateway] 📨 Generic JSON data:', parsedData);
                      onEvent({ type: 'status', data: JSON.stringify(parsedData) });
                    }
                  } catch (parseError) {
                    // Handle raw text data
                    if (data.includes('qr:')) {
                      const qrMatch = data.match(/qr:\s*(.+)/);
                      if (qrMatch) {
                        console.log('[whatsappGateway] 🎯 QR code found in raw data');
                        onEvent({ type: 'qr', data: qrMatch[1] });
                        continue;
                      }
                    }
                    
                    if (data.includes('connected')) {
                      console.log('[whatsappGateway] ✅ Connected event from raw data');
                      onEvent({ type: 'connected', data: data });
                      continue;
                    }
                    
                    if (data.includes('disconnected')) {
                      console.log('[whatsappGateway] ❌ Disconnected event from raw data');
                      onEvent({ type: 'disconnected', data: data });
                      continue;
                    }
                    
                    console.log('[whatsappGateway] 📨 Raw SSE data:', data.substring(0, 100));
                    onEvent({ type: 'status', data: data });
                  }
                }
              }
            };
            
            // Process stream
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log('[whatsappGateway] ✅ QR stream completed');
                break;
              }
              
              buffer += decoder.decode(value, { stream: true });
              
              // Process complete messages
              const messageEnd = buffer.indexOf('\n\n');
              if (messageEnd !== -1) {
                const message = buffer.substring(0, messageEnd);
                buffer = buffer.substring(messageEnd + 2);
                
                processSSEData(message);
              }
            }
            
            break;
            
          } catch (endpointError) {
            if (endpointError instanceof Error && endpointError.name === 'AbortError') {
              console.log('[whatsappGateway] 🔐 QR stream aborted');
              return;
            }
            console.warn('[whatsappGateway] ⚠️ Failed to start QR stream with:', path, endpointError);
          }
        }
        
        if (!streamStarted) {
          console.error('[whatsappGateway] ❌ All QR endpoints failed');
          onEvent({ type: 'error', data: 'Nenhum endpoint de QR encontrado' });
        }
        
      } catch (error) {
        console.error('[whatsappGateway] ❌ QR Stream setup error:', error);
        onEvent({ type: 'error', data: error instanceof Error ? error.message : 'Erro inesperado no stream de QR' });
      }
    };
    
    // Start the stream
    startStream();
    
    // Return close function
    return {
      close: () => {
        if (abortController) {
          console.log('[whatsappGateway] 🔐 Closing QR stream');
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
          const connection = await res.json();
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
      
      // Try deleting via gateway first
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const clientToken = session?.access_token;
        const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
        
        const headers: Record<string, string> = {
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
          method: 'DELETE',
          headers,
        });
        
        if (res.ok) {
          console.log('[whatsappGateway] ✅ Connection deleted via gateway');
          return;
        } else {
          console.warn('[whatsappGateway] ⚠️ Gateway delete failed, falling back to Supabase');
          throw new Error(`Gateway failed: ${res.status}`);
        }
      } catch (gatewayError) {
        console.warn('[whatsappGateway] ⚠️ Gateway delete failed, falling back to Supabase:', gatewayError);
        
        // Fallback: delete directly from Supabase
        const { error: supabaseError } = await supabase
          .from('whatsapp_connections')
          .delete()
          .eq('id', connectionId)
          .eq('tenant_id', tenantId);
        
        if (supabaseError) {
          throw new Error(`Falha ao excluir conexão: ${supabaseError.message}`);
        }
        
        console.log('[whatsappGateway] ✅ Connection deleted from Supabase (fallback)');
      }
      
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
        
        abortController = new AbortController();
        
        const url = new URL(`${baseUrl}/connections/${connectionId}/events`);
        url.searchParams.append('tenant_id', tenantId);
        
        const headers = {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${GATEWAY_AUTH_TOKEN}`,
        };
        
        console.log('[whatsappGateway] 🔄 Opening events stream with Authorization header');

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
        
        console.log('[whatsappGateway] ✅ Events stream connected successfully');
        onEvent({ type: 'status', data: 'Events stream connected' });
        
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
                  console.log('[whatsappGateway] 📨 Events SSE event from JSON:', parsedData.type);
                  onEvent(parsedData as GatewayEvent);
                } else if (eventType) {
                  console.log('[whatsappGateway] 📨 Events SSE event:', eventType);
                  onEvent({ type: eventType, data: parsedData });
                } else {
                  onEvent({ type: 'message', data: parsedData });
                }
              } catch (parseError) {
                console.log('[whatsappGateway] 📨 Events SSE raw message:', data.substring(0, 100));
                if (eventType) {
                  onEvent({ type: eventType, data });
                } else {
                  onEvent({ type: 'message', data });
                }
              }
              
              eventType = ''; // Reset event type after processing
            }
          }
        };
        
        // Process stream
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[whatsappGateway] ✅ Events stream completed');
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete messages
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
        if (abortController) {
          console.log('[whatsappGateway] 🔐 Closing events stream');
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
        const errorText = await res.text();
        console.error('[whatsappGateway] ❌ Send message error:', res.status, errorText);
        throw new Error(`Falha ao enviar mensagem: ${res.status} - ${errorText}`);
      }
      
      const result = await res.json();
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
      
      const result = await response.json();
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
      
      const data = await res.json();
      
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
  refreshConnection: async (connectionId: string): Promise<void> => {
    console.log('🔄 Refreshing connection:', connectionId);
    const tenantId = await getTenantId();
    
    const url = new URL('/refresh-connection', getBaseUrl());
    url.searchParams.set('connection_id', connectionId);
    url.searchParams.set('tenant_id', tenantId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh connection: ${response.status} - ${errorText}`);
    }

    console.log('✅ Connection refreshed successfully');
  },

  // Restart connection
  restartConnection: async (connectionId: string): Promise<void> => {
    console.log('🔄 Restarting connection:', connectionId);
    const tenantId = await getTenantId();
    
    const endpoints = [
      `/connections/${connectionId}/restart`,
      `/connection/${connectionId}/restart`,
      `/api/connections/${connectionId}/restart`
    ];

    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint, getBaseUrl());
        url.searchParams.set('tenant_id', tenantId);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: getHeaders()
        });

        if (response.ok) {
          console.log('✅ Connection restarted successfully');
          return;
        }
      } catch (error) {
        console.log(`❌ Restart endpoint ${endpoint} failed:`, error);
      }
    }
    
    throw new Error('Failed to restart connection - no available endpoint');
  },

  // Disconnect connection
  disconnectConnection: async (connectionId: string): Promise<void> => {
    console.log('🔄 Disconnecting connection:', connectionId);
    const tenantId = await getTenantId();
    
    const endpoints = [
      `/connections/${connectionId}/disconnect`,
      `/connection/${connectionId}/disconnect`,
      `/api/connections/${connectionId}/disconnect`
    ];

    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint, getBaseUrl());
        url.searchParams.set('tenant_id', tenantId);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: getHeaders()
        });

        if (response.ok) {
          console.log('✅ Connection disconnected successfully');
          return;
        }
      } catch (error) {
        console.log(`❌ Disconnect endpoint ${endpoint} failed:`, error);
      }
    }
    
    throw new Error('Failed to disconnect connection - no available endpoint');
  },
};
