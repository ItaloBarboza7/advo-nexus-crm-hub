
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

const getBaseUrl = () => {
  return 'https://evojuris-whatsapp.onrender.com';
};

const isUsingProxy = () => {
  return false;
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Authorization': 'Bearer h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F'
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
        message: 'Gateway is healthy (direct connection to Render)',
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
      const url = new URL(`${baseUrl}/connections`);
      url.searchParams.append('tenant_id', tenantId);
      
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Falha ao listar conexões: ${res.status} ${text.substring(0, 200)}`);
      }
      
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.connections ?? []);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão: Verifique se o gateway está ativo e configurado corretamente');
      }
      throw error;
    }
  },

  async createConnection(name: string): Promise<GatewayConnection> {
    try {
      const tenantId = await getTenantId();
      
      // Get current user for created_by_user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('[whatsappGateway] Creating connection directly in Supabase...');
      
      // Create connection record directly in Supabase
      const { data: connection, error: supabaseError } = await supabase
        .from('whatsapp_connections')
        .insert({
          name,
          tenant_id: tenantId,
          created_by_user_id: user.id,
          phone_number: "", // Placeholder, will be updated when connection is established
          status: 'disconnected'
        })
        .select()
        .single();
      
      if (supabaseError) {
        console.error('[whatsappGateway] Supabase insert error:', supabaseError);
        throw new Error(`Falha ao criar registro de conexão: ${supabaseError.message}`);
      }
      
      console.log('[whatsappGateway] Connection created successfully:', connection);
      
      // Map Supabase connection to GatewayConnection format
      return {
        id: connection.id,
        name: connection.name,
        status: connection.status,
        phone_number: connection.phone_number,
        last_connected_at: connection.last_connected_at
      };
      
    } catch (error) {
      console.error('[whatsappGateway] createConnection error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro inesperado ao criar conexão');
    }
  },

  openQrStream(connectionId: string, onEvent: (evt: GatewayEvent) => void) {
    const baseUrl = getBaseUrl();
    const abortController = new AbortController();
    
    const startStream = async () => {
      try {
        const response = await fetch(`${baseUrl}/connections/${connectionId}/qr`, {
          method: 'GET',
          headers: getHeaders(),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        const decoder = new TextDecoder();
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
                const dataStr = line.slice(6);
                if (dataStr.trim() === '') continue;
                
                const data = JSON.parse(dataStr);
                if (data && data.type) {
                  onEvent(data as GatewayEvent);
                } else if (typeof data === 'string') {
                  onEvent({ type: 'status', data } as GatewayEvent);
                }
              } catch (parseError) {
                onEvent({ type: 'status', data: line.slice(6) } as GatewayEvent);
              }
            }
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('SSE Stream Error:', error);
          onEvent({ type: 'error', data: 'Erro na conexão com o stream de QR' });
        }
      }
    };

    startStream();

    return {
      close: () => {
        abortController.abort();
      }
    };
  },
};
