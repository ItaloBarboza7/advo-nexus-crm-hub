
export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company?: string;
  source: string | null;
  status: string;
  interest?: string;
  value: number | null;
  lastContact?: string;
  avatar?: string;
  description: string | null;
  state: string | null;
  action_type: string | null;
  loss_reason: string | null;
  created_at: string;
  updated_at: string;
}
