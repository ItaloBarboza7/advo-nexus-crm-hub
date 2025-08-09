
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Usar o hook de tenant schema com estados corretos
  const { tenantSchema, isLoading: schemaLoading, error: schemaError } = useTenantSchema();

  const fetchLeads = useCallback(async () => {
    // Se há erro no schema, parar o loading e não buscar leads
    if (schemaError) {
      console.error('❌ useLeadsData - Erro no schema do tenant:', schemaError);
      setIsLoading(false);
      setError(schemaError);
      return;
    }

    // Se ainda está carregando o schema, aguardar
    if (schemaLoading || !tenantSchema) {
      return;
    }

    try {
      console.log("🔍 useLeadsData - Buscando leads...");
      setError(null);

      // Buscar leads usando o esquema do tenant
      const { data, error: fetchError } = await supabase.rpc('exec_sql', {
        sql: `SELECT * FROM ${tenantSchema}.leads ORDER BY created_at DESC`
      });

      if (fetchError) {
        console.error('❌ Erro ao buscar leads:', fetchError);
        setError(fetchError.message);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Converter dados para array de leads
      const leadsArray = Array.isArray(data) ? data : [];
      console.log(`✅ useLeadsData - ${leadsArray.length} leads carregados`);
      
      setLeads(leadsArray);
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
      setError(error.message);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, schemaLoading, schemaError, toast]);

  // Executar fetch quando o tenant schema estiver disponível
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Função para refetch manual
  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchLeads();
  }, [fetchLeads]);

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

  return {
    leads,
    isLoading: isLoading || schemaLoading, // Considerar ambos os loadings
    error: error || schemaError, // Considerar ambos os erros
    refetch,
    stats
  };
}
