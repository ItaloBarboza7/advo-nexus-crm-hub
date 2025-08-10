
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
};

const getBaseUrl = () => {
  return import.meta.env.VITE_WHATSAPP_GATEWAY_URL || 'https://evojuris-whatsapp.onrender.com';
};

export const whatsappGateway = {
  async testHealth(): Promise<GatewayHealthStatus> {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
      });
      
      const corsHeaders = res.headers.has('access-control-allow-origin');
      
      if (!res.ok) {
        return {
          status: 'error',
          message: `Health check failed: ${res.status} ${res.statusText}`,
          corsHeaders,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        status: 'ok',
        message: 'Gateway is healthy',
        corsHeaders,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        corsHeaders: false,
        timestamp: new Date().toISOString()
      };
    }
  },

  async listConnections(): Promise<GatewayConnection[]> {
    const baseUrl = getBaseUrl();
    
    // Try direct endpoint first
    try {
      const res = await fetch(`${baseUrl}/connections`, {
        method: 'GET',
      });
      
      if (!res.ok) {
        // If 404, try with /api prefix
        if (res.status === 404) {
          console.log('Trying /api/connections fallback...');
          const apiRes = await fetch(`${baseUrl}/api/connections`, {
            method: 'GET',
          });
          
          if (!apiRes.ok) {
            const text = await apiRes.text();
            throw new Error(`Rota não encontrada: ${apiRes.status} ${text}`);
          }
          
          const data = await apiRes.json();
          return Array.isArray(data) ? data : (data?.connections ?? []);
        }
        
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
      // Try direct endpoint first
      let res = await fetch(`${baseUrl}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      // If 404, try with /api prefix
      if (!res.ok && res.status === 404) {
        console.log('Trying /api/connections fallback for POST...');
        res = await fetch(`${baseUrl}/api/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      }
      
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
    
    // Try direct endpoint first
    let es = new EventSource(`${baseUrl}/connections/${connectionId}/qr`, {
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
      es.close();
      
      // Try /api fallback
      console.log('Trying /api/connections fallback for SSE...');
      es = new EventSource(`${baseUrl}/api/connections/${connectionId}/qr`, {
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
      
      es.onerror = () => {
        onEvent({ type: 'error', data: 'Erro na conexão com o stream de QR' });
      };
    };

    return es;
  },
};
