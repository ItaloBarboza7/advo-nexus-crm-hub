
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
