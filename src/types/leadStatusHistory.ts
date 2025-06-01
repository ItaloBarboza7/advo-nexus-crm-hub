
export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  created_at: string;
}

export interface LossReason {
  id: string;
  reason: string;
  created_at: string;
}
