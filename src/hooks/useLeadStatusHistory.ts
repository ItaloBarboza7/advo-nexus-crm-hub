
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export function useLeadStatusHistory() {
  const [statusHistory, setStatusHistory] = useState<LeadStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchStatusHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de status:', error);
        return;
      }

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasLeadPassedThroughStatus = (leadId: string, statuses: string[]): boolean => {
    return statusHistory.some(history => 
      history.lead_id === leadId && 
      statuses.includes(history.new_status)
    );
  };

  useEffect(() => {
    fetchStatusHistory();
  }, []);

  return {
    statusHistory,
    isLoading,
    fetchStatusHistory,
    hasLeadPassedThroughStatus
  };
}
