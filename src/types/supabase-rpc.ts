
// Custom types for RPC functions that aren't in the auto-generated types
export interface TenantLead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  description: string | null;
  source: string | null;
  state: string | null;
  status: string;
  action_group: string | null;
  action_type: string | null;
  loss_reason: string | null;
  value: number | null;
  user_id: string;
  closed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantKanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Extended Supabase client with custom RPC functions
export interface CustomSupabaseClient {
  rpc: {
    get_tenant_leads: () => Promise<{ data: TenantLead[] | null; error: any }>;
    get_tenant_kanban_columns: () => Promise<{ data: TenantKanbanColumn[] | null; error: any }>;
    create_tenant_lead: (params: {
      p_name: string;
      p_email?: string | null;
      p_phone: string;
      p_description?: string | null;
      p_source?: string | null;
      p_state?: string | null;
      p_action_group?: string | null;
      p_action_type?: string | null;
      p_value?: number | null;
    }) => Promise<{ data: string | null; error: any }>;
    update_tenant_lead: (params: {
      p_lead_id: string;
      p_name: string;
      p_email?: string | null;
      p_phone: string;
      p_state?: string | null;
      p_source?: string | null;
      p_status: string;
      p_action_group?: string | null;
      p_action_type?: string | null;
      p_value?: number | null;
      p_description?: string | null;
      p_loss_reason?: string | null;
    }) => Promise<{ data: boolean | null; error: any }>;
  };
}
