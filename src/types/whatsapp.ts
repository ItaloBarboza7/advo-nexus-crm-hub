
export interface WhatsAppConnection {
  id: string;
  name: string;
  phone_number: string;
  status: 'connected' | 'disconnected' | 'pending';
  qr_code?: string;
  webhook_url?: string;
  tenant_id: string;
  created_by_user_id: string;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppConnectionRequest {
  name: string;
  phone_number: string;
  webhook_url?: string;
}

export interface UpdateWhatsAppConnectionRequest {
  name?: string;
  phone_number?: string;
  status?: 'connected' | 'disconnected' | 'pending';
  qr_code?: string;
  webhook_url?: string;
  last_connected_at?: string;
}
