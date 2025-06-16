
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

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
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const fetchStatusHistory = async () => {
    try {
      setIsLoading(true);
      console.log("📊 useLeadStatusHistory - Carregando histórico do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT * FROM ${schema}.lead_status_history ORDER BY changed_at DESC`
      });

      if (error) {
        console.error('❌ Erro ao buscar histórico de status:', error);
        return;
      }

      console.log(`✅ useLeadStatusHistory - ${(data || []).length} registros de histórico carregados do esquema ${schema}`);
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
    if (tenantSchema) {
      fetchStatusHistory();
    }
  }, [tenantSchema]);

  return {
    statusHistory,
    isLoading,
    fetchStatusHistory,
    hasLeadPassedThroughStatus
  };
}
