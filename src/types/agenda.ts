
export interface AgendaTask {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  assigned_to_user_id: string;
  created_by_user_id: string;
  tenant_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  assigned_to?: {
    name: string;
    email?: string;
  };
  created_by?: {
    name: string;
    email?: string;
  };
}

export interface CreateAgendaTaskRequest {
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  assigned_to_user_id: string;
}

export interface UpdateAgendaTaskRequest {
  title?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_to_user_id?: string;
  status?: 'pending' | 'completed' | 'cancelled';
}
