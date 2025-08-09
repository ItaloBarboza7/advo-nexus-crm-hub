
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';

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

      // Converter dados para Lead[] com todos os campos necessários
      const leadsData = Array.isArray(data) ? data.map((item: any): Lead => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        email: item.email ? String(item.email) : null,
        phone: String(item.phone || ''),
        description: item.description ? String(item.description) : null,
        source: item.source ? String(item.source) : null,
        status: String(item.status || 'Novo'),
        state: item.state ? String(item.state) : null,
        action_group: item.action_group ? String(item.action_group) : null,
        action_type: item.action_type ? String(item.action_type) : null,
        loss_reason: item.loss_reason ? String(item.loss_reason) : null,
        value: item.value ? Number(item.value) : null,
        user_id: String(item.user_id || ''),
        closed_by_user_id: item.closed_by_user_id ? String(item.closed_by_user_id) : null,
        created_at: String(item.created_at || ''),
        updated_at: String(item.updated_at || '')
      })).filter(lead => lead.id && lead.name && lead.phone) : [];

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
