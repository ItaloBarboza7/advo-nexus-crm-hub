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

export type BootstrapSyncResult = {
  success: boolean;
  contacts_synced?: number;
  chats_synced?: number;
  messages_synced?: number;
  synced_resources?: number;
  total_items?: number;
  message?: string;
  error?: string;
};

// Conexão direta com o servidor Render (sem proxy do Supabase)
const DIRECT_GATEWAY_BASE = "https://evojuris-whatsapp.onrender.com";
const GATEWAY_AUTH_TOKEN = "h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F";

// Supabase Edge Function proxy for specific operations
const PROXY_BASE = "https://xltugnmjbcowsuwzkkni.supabase.co/functions/v1/whatsapp-proxy";

// Usar conexão direta para evitar problemas com o proxy
const getBaseUrl = () => {
  return DIRECT_GATEWAY_BASE;
};

// QR stream também direto
const getQrStreamBaseUrl = () => {
  return DIRECT_GATEWAY_BASE;
};

// WebSocket base URL for real-time communication
const getWsBaseUrl = () => {
  return "wss://evojuris-whatsapp.onrender.com";
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

// WebSocket helper for handling JSON-based WebSocket connections
const openJsonWebSocket = (url: string, onEvent: (evt: GatewayEvent) => void) => {
  console.log('[whatsappGateway] 🔌 Opening WebSocket connection:', url);
  
  const ws = new WebSocket(url);
  let isClosing = false;
  let pingInterval: NodeJS.Timeout | null = null;
  
  ws.onopen = () => {
    console.log('[whatsappGateway] ✅ WebSocket connected successfully');
    
    // Send ping every 25 seconds to keep connection alive
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
        console.log('[whatsappGateway] 🏓 Ping sent to keep WebSocket alive');
      }
    }, 25000);
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[whatsappGateway] 📨 WebSocket message received:', message);
      
      // Handle different message formats
      if (message.event && message.data !== undefined) {
        // Format: {"event": "qr", "data": {"qr": "..."}}
        const eventType = message.event;
        const eventData = message.data;
        
        if (eventType === 'qr') {
          const qrData = eventData.qr || eventData.qr_code || eventData.qrcode || eventData;
          onEvent({ type: 'qr', data: qrData });
        } else if (eventType === 'status') {
          // Check if status message indicates connection success
          const statusMessage = String(eventData.message || eventData).toLowerCase();
          if (statusMessage.includes('connected') || statusMessage.includes('authenticated') || statusMessage.includes('ready')) {
            onEvent({ type: 'connected', data: eventData });
          } else {
            onEvent({ type: 'status', data: eventData.message || eventData });
          }
        } else if (eventType === 'connected' || eventType === 'connection.ready' || eventType === 'authenticated') {
          // Normalize all connection success events to 'connected'
          onEvent({ type: 'connected', data: eventData });
        } else if (eventType === 'disconnected' || eventType === 'connection.closed') {
          // Normalize disconnection events
          onEvent({ type: 'disconnected', data: eventData });
        } else if (eventType === 'connection.update') {
          // Handle connection updates - these might contain QR or status changes
          if (eventData.qr || eventData.qr_code || eventData.qrcode) {
            const qrData = eventData.qr || eventData.qr_code || eventData.qrcode;
            onEvent({ type: 'qr', data: qrData });
          } else if (eventData.status) {
            const statusMessage = String(eventData.status).toLowerCase();
            if (statusMessage.includes('connected') || statusMessage.includes('authenticated')) {
              onEvent({ type: 'connected', data: eventData });
            } else {
              onEvent({ type: 'status', data: eventData.status });
            }
          } else {
            onEvent({ type: eventType, data: eventData });
          }
        } else {
          onEvent({ type: eventType, data: eventData });
        }
      } else if (message.type) {
        // Direct format: {"type": "qr", "data": "..."}
        const normalizedMessage = { ...message };
        
        // Normalize connection success events
        if (message.type === 'connection.ready' || message.type === 'authenticated') {
          normalizedMessage.type = 'connected';
        } else if (message.type === 'connection.closed') {
          normalizedMessage.type = 'disconnected';
        }
        
        onEvent(normalizedMessage);
      }
    } catch (error) {
      console.error('[whatsappGateway] ❌ Error parsing WebSocket message:', error, event.data);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[whatsappGateway] ❌ WebSocket error:', error);
    onEvent({ type: 'error', data: 'WebSocket connection error' });
  };
  
  ws.onclose = (event) => {
    console.log('[whatsappGateway] 🔌 WebSocket closed:', event.code, event.reason);
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    if (!isClosing) {
      onEvent({ type: 'disconnected', data: 'WebSocket connection closed' });
    }
  };
  
  return {
    close: () => {
      console.log('[whatsappGateway] 🔌 Closing WebSocket connection');
      isClosing = true;
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  };
};

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
    console.log('[whatsappGateway] 🔌 Opening QR WebSocket stream for connection:', connectionId);
    
    let wsConnection: { close: () => void } | null = null;
    
    const startStream = async () => {
      try {
        const tenantId = await getTenantId();
        const wsBaseUrl = getWsBaseUrl();
        
        console.log('[whatsappGateway] 🔐 WebSocket auth info for QR stream:', {
          hasGatewayToken: !!GATEWAY_AUTH_TOKEN,
          tenantId,
          connectionId,
          wsBaseUrl
        });
        
        // Create WebSocket URL with required parameters
        const wsUrl = new URL(wsBaseUrl);
        wsUrl.searchParams.append('connectionId', connectionId);
        wsUrl.searchParams.append('token', GATEWAY_AUTH_TOKEN);
        wsUrl.searchParams.append('tenant_id', tenantId);
        
        console.log('[whatsappGateway] 🚀 Connecting to QR WebSocket:', wsUrl.toString());
        
        wsConnection = openJsonWebSocket(wsUrl.toString(), onEvent);
        
      } catch (error) {
        console.error('[whatsappGateway] ❌ QR WebSocket stream error:', error);
        onEvent({ type: 'error', data: error instanceof Error ? error.message : 'Erro inesperado no stream QR' });
      }
    };
    
    // Start the stream asynchronously
    startStream();
    
    return {
      close: () => {
        console.log('[whatsappGateway] 🔐 Closing QR WebSocket');
        if (wsConnection) {
          wsConnection.close();
          wsConnection = null;
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
    console.log('[whatsappGateway] 🔌 Opening events WebSocket stream for connection:', connectionId);
    
    let wsConnection: { close: () => void } | null = null;
    
    const startStream = async () => {
      try {
        const tenantId = await getTenantId();
        const wsBaseUrl = getWsBaseUrl();
        
        console.log('[whatsappGateway] 🔐 WebSocket auth info for events stream:', {
          hasGatewayToken: !!GATEWAY_AUTH_TOKEN,
          tenantId,
          connectionId,
          wsBaseUrl
        });
        
        // Create WebSocket URL with required parameters
        const wsUrl = new URL(wsBaseUrl);
        wsUrl.searchParams.append('connectionId', connectionId);
        wsUrl.searchParams.append('token', GATEWAY_AUTH_TOKEN);
        wsUrl.searchParams.append('tenant_id', tenantId);
        wsUrl.searchParams.append('events', 'true'); // Indicate this is for events stream
        
        console.log('[whatsappGateway] 🚀 Connecting to events WebSocket:', wsUrl.toString());
        
        wsConnection = openJsonWebSocket(wsUrl.toString(), onEvent);
        
      } catch (error) {
        console.error('[whatsappGateway] ❌ Events WebSocket stream error:', error);
        onEvent({ type: 'error', data: error instanceof Error ? error.message : 'Erro inesperado no stream de eventos' });
      }
    };
    
    // Start the stream asynchronously
    startStream();
    
    return {
      close: () => {
        console.log('[whatsappGateway] 🔐 Closing events WebSocket');
        if (wsConnection) {
          wsConnection.close();
          wsConnection = null;
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

  // Bootstrap sync for initial data fetch - uses Supabase Edge Function
  async bootstrapSync(connectionId: string): Promise<BootstrapSyncResult> {
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔄 Starting bootstrap sync for connection:', connectionId);
      
      // Get authentication headers for Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      const url = new URL(`${PROXY_BASE}/bootstrap`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
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

  // Force reset connection session - uses Supabase Edge Function
  forceResetConnection: async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const tenantId = await getTenantId();
      
      // Get authentication for Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      console.log('[whatsappGateway] 💥 Force resetting connection session:', connectionId);
      
      const url = new URL(`${PROXY_BASE}/force-reset-connection`);
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

  // Refresh connection info - uses Supabase Edge Function
  async refreshConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const tenantId = await getTenantId();
      
      // Get authentication for Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      console.log('[whatsappGateway] 🔄 Refreshing connection:', connectionId);
      
      const url = new URL(`${PROXY_BASE}/refresh-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'GET', 
        headers,
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
    try {
      const tenantId = await getTenantId();
      
      console.log('[whatsappGateway] 🔌 Disconnecting connection:', connectionId);
      
      // Get authentication for Supabase proxy
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      // Use Supabase proxy for disconnect
      const url = new URL(`${PROXY_BASE}/disconnect-connection`);
      url.searchParams.append('connection_id', connectionId);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
      });
      
      const data = await safeJsonResponse(res);
      
      if (res.ok && data.success) {
        console.log('[whatsappGateway] ✅ Connection disconnected successfully:', data.message);
        return { success: true, message: data.message };
      } else {
        console.warn('[whatsappGateway] ⚠️ Connection disconnect had issues:', data.message);
        throw new Error(data.message || 'Connection disconnect failed');
      }
      
    } catch (error) {
      console.error('[whatsappGateway] ❌ disconnectConnection error:', error);
      throw error;
    }
  }
};
