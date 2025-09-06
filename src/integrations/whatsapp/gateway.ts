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

// Forçar base do proxy do Supabase (sem depender de VITE_*)
// Project ref: xltugnmjbcowsuwzkkni
const SUPABASE_EDGE_PROXY_BASE =
  "https://xltugnmjbcowsuwzkkni.supabase.co/functions/v1/whatsapp-proxy";

// Base direta do Render (mantida apenas como referência)
const DIRECT_GATEWAY_BASE = "https://evojuris-whatsapp.onrender.com";

// Sempre usar o proxy (inclusive para health/list/create) para evitar CORS
const getBaseUrl = () => {
  return SUPABASE_EDGE_PROXY_BASE;
};

// QR stream também sempre via proxy
const getQrStreamBaseUrl = () => {
  return SUPABASE_EDGE_PROXY_BASE;
};

const isUsingProxy = () => {
  return true;
};

// Remover Authorization header - o proxy já injeta o token via secret
const getHeaders = () => {
  const headers: Record<string, string> = {};
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
        message: 'Gateway is healthy (via Supabase proxy)',
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
      
      // First, get connections from Supabase (these are authoritative, especially for deletions)
      console.log('[whatsappGateway] 📋 Fetching connections from Supabase...');
      const { data: supabaseConnections, error: supabaseError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (supabaseError) {
        console.warn('[whatsappGateway] ⚠️ Failed to fetch from Supabase:', supabaseError);
      }
      
      // Then, try to get connections from gateway
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
      
      // Combine connections: prioritize Supabase data, supplement with gateway data
      const supabaseMap = new Map();
      const supabaseFormatted: GatewayConnection[] = (supabaseConnections || []).map(conn => {
        const formatted = {
          id: conn.id,
          name: conn.name,
          status: conn.status,
          phone_number: conn.phone_number,
          last_connected_at: conn.last_connected_at
        };
        supabaseMap.set(conn.id, formatted);
        return formatted;
      });
      
      // Add gateway connections that are not in Supabase (but only if they exist in Supabase didn't fail)
      const result = [...supabaseFormatted];
      if (!supabaseError) {
        for (const gatewayConn of gatewayConnections) {
          if (!supabaseMap.has(gatewayConn.id)) {
            result.push(gatewayConn);
          }
        }
      } else {
        // If Supabase failed, fallback to gateway only
        result.push(...gatewayConnections);
      }
      
      console.log('[whatsappGateway] 📋 Final connections list:', result.length, 'connections');
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
      
      // Primeiro, tentar criar via POST no gateway (sem enviar phone_number)
      try {
        // Obter autenticação do usuário para passar ao proxy
        const { data: { session } } = await supabase.auth.getSession();
        const clientToken = session?.access_token;
        const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...getHeaders(),
        };
        
        // Adicionar autenticação para que o proxy possa usar no fallback
        if (clientToken) {
          headers['Authorization'] = `Bearer ${clientToken}`;
        }
        if (clientApiKey) {
          headers['apikey'] = clientApiKey;
        }
        
        console.log('[whatsappGateway] Creating connection with auth headers:', {
          hasToken: !!clientToken,
          hasApiKey: !!clientApiKey
        });
        
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
      
      // Obter autenticação do usuário
      const { data: { session } } = await supabase.auth.getSession();
      const clientToken = session?.access_token;
      const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Adicionar autenticação nos headers
      if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
      }
      if (clientApiKey) {
        headers['apikey'] = clientApiKey;
      }
      
      console.log('[whatsappGateway] 🔗 Connecting to gateway:', {
        connectionId,
        tenantId,
        hasToken: !!clientToken,
        hasApiKey: !!clientApiKey
      });
      
      const url = new URL(`${baseUrl}/connections/${connectionId}/connect`);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.warn('[whatsappGateway] ⚠️ Connect failed:', res.status, text);
        throw new Error(`Connect failed: ${res.status} - ${text}`);
      }
      
      console.log('[whatsappGateway] ✅ Connection initiated successfully');
    } catch (error) {
      console.error('[whatsappGateway] ❌ connect error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao conectar');
    }
  },

  openQrStream(connectionId: string, onEvent: (evt: GatewayEvent) => void) {
    const baseUrl = getQrStreamBaseUrl();
    let eventSource: EventSource | null = null;
    
    const startStream = async () => {
      try {
        const tenantId = await getTenantId();
        
        // Obter autenticação do usuário
        const { data: { session } } = await supabase.auth.getSession();
        const clientToken = session?.access_token;
        const clientApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8'; // Supabase anon key
        
        console.log('[whatsappGateway] 🔐 Auth info:', {
          hasToken: !!clientToken,
          hasApiKey: !!clientApiKey,
          tenantId
        });
        
        const url = new URL(`${baseUrl}/connections/${connectionId}/qr`);
        url.searchParams.append('tenant_id', tenantId);
        
        // Passar autenticação via query params (EventSource não suporta headers customizados)
        if (clientToken) {
          url.searchParams.append('client_token', clientToken);
        }
        if (clientApiKey) {
          url.searchParams.append('client_apikey', clientApiKey);
        }
        
        console.log('[whatsappGateway] 🔄 Opening QR stream via EventSource:', url.toString().replace(clientToken || '', '[REDACTED]'));

        // Usar EventSource em vez de fetch para evitar CORS preflight
        eventSource = new EventSource(url.toString());
        
        eventSource.onopen = () => {
          console.log('[whatsappGateway] ✅ QR Stream connected successfully');
        };

        eventSource.onmessage = (event) => {
          console.log('[whatsappGateway] 📨 SSE message received:', event.data.substring(0, 100));
          
          try {
            // Tentar parsear como JSON primeiro
            const data = JSON.parse(event.data);
            
            // Verificar se contém QR code em diferentes formatos (expandido)
            const qrData = data.qr || data.qr_code || data.qrcode || data.qrCode || data.code || data.base64 || data.png || data.image || data.data;
            if (qrData && typeof qrData === 'string') {
              console.log('[whatsappGateway] 🎯 QR code found in JSON data');
              onEvent({ type: 'qr', data: qrData });
              return;
            }
            
            // Processar outros tipos de eventos
            if (data.type) {
              console.log('[whatsappGateway] 📨 SSE event from JSON:', data.type);
              onEvent(data as GatewayEvent);
            } else {
              // Evento genérico
              onEvent({ type: 'status', data: event.data });
            }
          } catch (parseError) {
            // Se não for JSON, pode ser QR code direto ou mensagem de status
            if (event.data.length > 100 || event.data.startsWith('data:image/')) {
              // Provavelmente QR code (strings longas ou data URLs)
              console.log('[whatsappGateway] 🎯 QR code found as raw string');
              onEvent({ type: 'qr', data: event.data });
            } else {
              // Mensagem de status
              console.log('[whatsappGateway] 📨 SSE status message:', event.data.substring(0, 100));
              onEvent({ type: 'status', data: event.data });
            }
          }
        };

        // Lidar com eventos tipados (event: qr, event: status, etc.)
        eventSource.addEventListener('qr', (event) => {
          console.log('[whatsappGateway] 🎯 QR event received');
          onEvent({ type: 'qr', data: (event as MessageEvent).data });
        });

        eventSource.addEventListener('status', (event) => {
          console.log('[whatsappGateway] 📊 Status event received');
          onEvent({ type: 'status', data: (event as MessageEvent).data });
        });

        eventSource.addEventListener('connected', (event) => {
          console.log('[whatsappGateway] ✅ Connected event received');
          onEvent({ type: 'connected', data: (event as MessageEvent).data });
        });

        eventSource.addEventListener('disconnected', (event) => {
          console.log('[whatsappGateway] ❌ Disconnected event received');
          onEvent({ type: 'disconnected', data: (event as MessageEvent).data });
        });

        eventSource.onerror = (error) => {
          console.error('[whatsappGateway] ❌ QR Stream Error:', error);
          
          if (eventSource?.readyState === EventSource.CLOSED) {
            console.log('[whatsappGateway] 🔌 QR Stream closed by server');
            onEvent({ type: 'error', data: 'Conexão com o stream de QR foi fechada pelo servidor' });
          } else if (eventSource?.readyState === EventSource.CONNECTING) {
            console.log('[whatsappGateway] 🔄 QR Stream trying to reconnect...');
            onEvent({ type: 'status', data: 'Tentando reconectar ao stream de QR...' });
          } else {
            onEvent({ type: 'error', data: 'Erro na conexão com o stream de QR. Verifique se o usuário está autenticado.' });
          }
        };

      } catch (error) {
        console.error('[whatsappGateway] ❌ QR Stream initialization error:', error);
        onEvent({ 
          type: 'error', 
          data: error instanceof Error ? error.message : 'Erro ao inicializar stream de QR' 
        });
      }
    };

    startStream();

    return {
      close: () => {
        console.log('[whatsappGateway] 🔌 Closing QR stream');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
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
};
