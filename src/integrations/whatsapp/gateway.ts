
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

const BASE_URL = 'https://evojuris-whatsapp.onrender.com';

export const whatsappGateway = {
  async listConnections(): Promise<GatewayConnection[]> {
    try {
      const res = await fetch(`${BASE_URL}/connections`, {
        method: 'GET',
        // Removed Content-Type header from GET request as it's not needed and can cause CORS issues
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
    try {
      const res = await fetch(`${BASE_URL}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const es = new EventSource(`${BASE_URL}/connections/${connectionId}/qr`, {
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
        // Se não for JSON, envia como status bruto
        onEvent({ type: 'status', data: e.data } as GatewayEvent);
      }
    };

    es.onerror = (error) => {
      console.error('SSE Error:', error);
      onEvent({ type: 'error', data: 'Erro na conexão com o stream de QR' });
      // EventSource faz auto-reconnect automaticamente
    };

    return es;
  },
};
