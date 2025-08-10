
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
    const res = await fetch(`${BASE_URL}/connections`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Falha ao listar conexões: ${res.status} ${text}`);
    }
    const data = await res.json();
    // Espera que o gateway retorne uma lista coerente
    return Array.isArray(data) ? data : (data?.connections ?? []);
  },

  async createConnection(name: string): Promise<GatewayConnection> {
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

    es.onerror = () => {
      onEvent({ type: 'error', data: 'SSE error' });
      // EventSource faz auto-reconnect. Não fechamos aqui.
    };

    return es;
  },
};
