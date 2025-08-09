
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';
import { toLeadRecordArray } from '@/utils/typeGuards';

export function useEnhancedLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { addDebugLog, startOperation, endOperation } = useLeadsDebugger();
  
  // Usar o hook de tenant schema com estados corretos
  const { tenantSchema, isLoading: schemaLoading, error: schemaError } = useTenantSchema();

  const fetchLeads = useCallback(async () => {
    // Se há erro no schema, parar o loading e não buscar leads
    if (schemaError) {
      console.error('❌ useEnhancedLeadsData - Erro no schema do tenant:', schemaError);
      setIsLoading(false);
      setError(schemaError);
      addDebugLog('fetch_leads_schema_error', { error: schemaError }, false);
      return;
    }

    // Se ainda está carregando o schema, aguardar
    if (schemaLoading || !tenantSchema) {
      return;
    }

    try {
      startOperation('fetch_leads_enhanced');
      console.log("🔍 useEnhancedLeadsData - Buscando leads do esquema:", tenantSchema);
      
      setError(null);
      addDebugLog('fetch_leads_start', { schema: tenantSchema }, true);

      const sql = `
        SELECT 
          id, name, email, phone, description, source, state, status,
          action_group, action_type, loss_reason, value, user_id,
          closed_by_user_id, created_at, updated_at
        FROM ${tenantSchema}.leads 
        ORDER BY created_at DESC
      `;

      const { data, error: fetchError } = await supabase.rpc('exec_sql', { sql });

      if (fetchError) {
        console.error('❌ Erro ao buscar leads:', fetchError);
        setError(fetchError.message);
        addDebugLog('fetch_leads_error', { error: fetchError }, false);
        endOperation('fetch_leads_enhanced', { error: fetchError.message }, false);
        
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Converter dados usando type guard
      const leadsData = toLeadRecordArray(data || []);
      console.log(`✅ useEnhancedLeadsData - ${leadsData.length} leads carregados`);
      
      addDebugLog('fetch_leads_success', { 
        count: leadsData.length,
        schema: tenantSchema 
      }, true);
      endOperation('fetch_leads_enhanced', { leadsCount: leadsData.length }, true);
      
      setLeads(leadsData);
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
      setError(error.message);
      addDebugLog('fetch_leads_unexpected_error', { error: error.message }, false);
      endOperation('fetch_leads_enhanced', { error: error.message }, false);
      
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, schemaLoading, schemaError, toast, addDebugLog, startOperation, endOperation]);

  // Executar fetch quando o tenant schema estiver disponível
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Função para refetch manual
  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    isLoading: isLoading || schemaLoading, // Considerar ambos os loadings
    error: error || schemaError, // Considerar ambos os erros
    refetch
  };
}
