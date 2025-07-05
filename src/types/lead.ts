
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
  action_group: string | null; // Renomeado de action_type
  action_type: string | null; // Novo campo para tipo específico
  loss_reason: string | null;
  closed_by_user_id: string | null; // Novo campo para rastrear quem fechou o contrato
  user_id: string; // Adicionado para resolver o erro TypeScript
  created_at: string;
  updated_at: string;
}
