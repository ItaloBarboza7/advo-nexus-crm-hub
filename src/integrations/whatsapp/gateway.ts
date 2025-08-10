
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
  // Always use hardcoded proxy URL to avoid import.meta.env issues
  return 'https://xltugnmjbcowsuwzkkni.supabase.co/functions/v1/whatsapp-proxy';
};

const isUsingProxy = () => {
  return true; // Always using proxy now
};

const getHeaders = () => {
  const headers: Record<string, string> = {};
  
  // Add Supabase headers when using proxy
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';
  if (apiKey) {
    headers['apikey'] = apiKey;
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
          message: `Health check failed: ${res.status} ${text.substring(0, 200)}`,
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
        throw new Error(`Falha ao criar conexão: ${res.status} ${text.substring(0, 200)}`);
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
