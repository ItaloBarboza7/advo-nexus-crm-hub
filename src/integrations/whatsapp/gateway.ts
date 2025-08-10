
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
  // Try proxy first, fallback to direct gateway
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/whatsapp-proxy`;
  }
  return import.meta.env.VITE_WHATSAPP_GATEWAY_URL || 'https://evojuris-whatsapp.onrender.com';
};

const isUsingProxy = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return !!supabaseUrl;
};

const getHeaders = () => {
  const headers: Record<string, string> = {};
  
  if (isUsingProxy()) {
    // Add Supabase headers when using proxy
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (apiKey) {
      headers['apikey'] = apiKey;
    }
  }
  
  return headers;
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
          message: `Health check failed: ${res.status} ${text}`,
          corsHeaders,
          proxyUsed,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        status: 'ok',
        message: proxyUsed ? 'Gateway is healthy (via proxy)' : 'Gateway is healthy (direct)',
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
      const res = await fetch(`${baseUrl}/connections`, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Falha ao listar conexões: ${res.status} ${text}`);
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
    const baseUrl = getBaseUrl();
    
    try {
      const res = await fetch(`${baseUrl}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({ name }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Falha ao criar conexão: ${res.status} ${text}`);
      }
      
      return res.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão: Não foi possível conectar ao gateway WhatsApp');
      }
      throw error;
    }
  },

  openQrStream(connectionId: string, onEvent: (evt: GatewayEvent) => void) {
    const baseUrl = getBaseUrl();
    
    const es = new EventSource(`${baseUrl}/connections/${connectionId}/qr`, {
      withCredentials: false,
    });

    es.onmessage = (e) => {
      try {
        const data = e.data ? JSON.parse(e.data) : null;
        if (data && data.type) {
          onEvent(data as GatewayEvent);
        } else if (typeof data === 'string') {
          onEvent({ type: 'status', data } as GatewayEvent);
        }
      } catch {
        onEvent({ type: 'status', data: e.data } as GatewayEvent);
      }
    };

    es.onerror = (error) => {
      console.error('SSE Error:', error);
      onEvent({ type: 'error', data: 'Erro na conexão com o stream de QR' });
    };

    return es;
  },
};
