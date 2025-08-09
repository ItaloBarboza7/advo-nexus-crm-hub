import { useState, useEffect, useCallback, useMemo } from 'react';
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

      // Converter dados para Lead[] usando o type guard
      const leadsData = toLeadRecordArray(data);

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

  // Função para refresh compatível com componentes antigos
  const refreshData = useCallback((options?: { forceRefresh?: boolean; source?: string }) => {
    console.log('🔄 useEnhancedLeadsData - refreshData called with options:', options);
    refetch();
  }, [refetch]);

  // Função updateLead para compatibilidade com componentes antigos
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    if (!tenantSchema) {
      console.error('❌ updateLead - Tenant schema não disponível');
      return false;
    }

    try {
      console.log('🔄 useEnhancedLeadsData - Updating lead:', leadId, updates);

      // Construir a query de update dinamicamente
      const updateFields: string[] = [];
      const values: (string | number | null)[] = [leadId];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          values.push(value as string | number | null);
          updateFields.push(`${key} = $${values.length}`);
        }
      });

      if (updateFields.length === 0) {
        console.warn('⚠️ updateLead - Nenhum campo para atualizar');
        return false;
      }

      const sql = `
        UPDATE ${tenantSchema}.leads 
        SET ${updateFields.join(', ')}, updated_at = now()
        WHERE id = $1
        RETURNING *
      `;

      // Para exec_sql, precisamos construir a query com valores literais
      let finalSql = sql;
      for (let i = values.length - 1; i >= 0; i--) {
        const value = values[i];
        const placeholder = `$${i + 1}`;
        const literalValue =
          value === null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
        finalSql = finalSql.replace(new RegExp(`\\${placeholder}`, 'g'), literalValue);
      }

      const { data, error: updateError } = await supabase.rpc('exec_sql', {
        sql: finalSql,
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar lead:', updateError);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // Atualizar o lead local
      const updatedLeadData = toLeadRecordArray(data);
      if (updatedLeadData.length > 0) {
        setLeads(prevLeads =>
          prevLeads.map(lead =>
            lead.id === leadId ? updatedLeadData[0] : lead
          )
        );
      }

      console.log('✅ Lead atualizado com sucesso');
      return true;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    }
  }, [tenantSchema, toast]);

  // Memoizar stats para evitar recálculos desnecessários
  const stats = useMemo(() => {
    if (!leads.length) {
      return {
        totalLeads: 0,
        totalProposals: 0,
        totalSales: 0,
        totalLosses: 0,
        conversionRate: 0
      };
    }

    const totalLeads = leads.length;
    const totalProposals = leads.filter(lead => 
      ['Proposta', 'Reunião'].includes(lead.status)
    ).length;
    const totalSales = leads.filter(lead => 
      lead.status === 'Contrato Fechado'
    ).length;
    const totalLosses = leads.filter(lead => 
      lead.status === 'Perdido'
    ).length;
    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;

    return {
      totalLeads,
      totalProposals,
      totalSales,
      totalLosses,
      conversionRate
    };
  }, [leads]);

  // Array de loss reasons para compatibilidade
  const lossReasons = useMemo(() => {
    return Array.from(new Set(
      leads
        .filter(lead => lead.loss_reason)
        .map(lead => lead.loss_reason!)
    ));
  }, [leads]);

  return {
    leads,
    isLoading: isLoading || schemaLoading, // Considerar ambos os loadings
    error: error || schemaError, // Considerar ambos os erros
    refetch,
    refreshData, // Para compatibilidade
    updateLead, // Para compatibilidade
    stats,
    lossReasons, // Para compatibilidade
    // Propriedades para compatibilidade com Dashboard
    cacheInfo: null,
    isPolling: false,
    hasRealtimeConnection: false
  };
}
