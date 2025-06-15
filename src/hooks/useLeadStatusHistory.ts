
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const fetchStatusHistory = async () => {
    try {
      setIsLoading(true);
      console.log("📊 useLeadStatusHistory - Carregando histórico (RLS automático)...");
      
      // O RLS já filtra automaticamente baseado nos leads do tenant
      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar histórico de status:', error);
        return;
      }

      console.log(`✅ useLeadStatusHistory - ${(data || []).length} registros de histórico carregados`);
      setStatusHistory(data || []);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar histórico:', error);
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
