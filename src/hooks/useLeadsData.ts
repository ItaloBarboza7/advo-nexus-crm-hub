
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { lossReasons } = useLossReasonsGlobal();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const mountedRef = useRef(true);
  const lastFetchTime = useRef(0);
  const realtimeChannel = useRef<any>(null);

  const fetchLeads = useCallback(async (forceRefresh = false, cacheBreaker = false) => {
    // Simple debounce: prevent fetches within 100ms unless forced
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime.current) < 100) {
      console.log("🚫 useLeadsData - Fetch muito recente, pulando...");
      return;
    }
    
    if (!tenantSchema) {
      console.log("🚫 useLeadsData - Schema do tenant não disponível");
      return;
    }
    
    try {
      lastFetchTime.current = now;
      setIsLoading(true);
      
      if (forceRefresh) {
        console.log("🔄 useLeadsData - FORÇANDO refresh dos leads no esquema do tenant...");
      } else {
        console.log("📊 useLeadsData - Buscando leads no esquema do tenant...");
      }
      
      // Add cache breaker to prevent Supabase RPC caching
      let sql = `SELECT * FROM ${tenantSchema}.leads ORDER BY created_at DESC`;
      if (cacheBreaker) {
        sql += ` -- ${Math.random()}`;
      }
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: sql
      });

      if (error) {
        console.error('❌ Erro ao buscar leads:', error);
        if (mountedRef.current) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os leads.",
            variant: "destructive"
          });
        }
        return;
      }

      const leadsData = Array.isArray(data) ? data : [];
      const transformedLeads: Lead[] = leadsData.map((lead: any) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
        closed_by_user_id: lead.closed_by_user_id || null
      }));

      if (forceRefresh) {
        console.log(`✅ useLeadsData - REFRESH FORÇADO: ${transformedLeads.length} leads carregados do esquema ${tenantSchema}`);
      } else {
        console.log(`✅ useLeadsData - ${transformedLeads.length} leads carregados do esquema ${tenantSchema}`);
      }
      
      if (mountedRef.current) {
        setLeads(transformedLeads);
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
      if (mountedRef.current) {
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado ao carregar os leads.",
          variant: "destructive"
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenantSchema, toast]);

  // Setup real-time subscription for immediate updates
  const setupRealtimeSubscription = useCallback(() => {
    if (!tenantSchema || realtimeChannel.current) return;

    console.log("🔄 useLeadsData - Configurando subscriçõa real-time...");
    
    realtimeChannel.current = supabase
      .channel(`leads_changes_${tenantSchema}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: tenantSchema,
          table: 'leads'
        },
        (payload) => {
          console.log('🔄 Real-time change detected:', payload);
          // Force refresh with cache breaker on any change
          fetchLeads(true, true);
        }
      )
      .subscribe();

  }, [tenantSchema, fetchLeads]);

  // Função de refresh que força a atualização
  const refreshData = useCallback((forceRefresh = false) => {
    if (forceRefresh) {
      console.log(`🔄 useLeadsData - Forçando atualização IMEDIATA dos leads...`);
      // Use cache breaker for forced refreshes
      fetchLeads(true, true);
    } else {
      console.log(`🔄 useLeadsData - Atualizando leads...`);
      fetchLeads(forceRefresh);
    }
  }, [fetchLeads]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    try {
      console.log(`📝 useLeadsData - Atualizando lead ${leadId}:`, updates);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // Remover campos undefined e preparar os valores para atualização
      const validUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          validUpdates[key] = value;
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        console.log('Nenhuma atualização válida para aplicar');
        return true;
      }

      // Construir a query SQL de forma segura
      const setClause = Object.keys(validUpdates)
        .map(key => {
          const value = validUpdates[key];
          // Escapar aspas simples nos valores string
          const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;
          return `${key} = '${escapedValue}'`;
        })
        .join(', ');

      const sql = `UPDATE ${schema}.leads SET ${setClause}, updated_at = now() WHERE id = '${leadId}'`;
      console.log('🔧 SQL de atualização:', sql);

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: sql
      });

      if (error) {
        console.error('❌ Erro ao atualizar lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...validUpdates } : lead
      ));

      console.log(`✅ useLeadsData - Lead ${leadId} atualizado com sucesso`);
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    }
  }, [tenantSchema, ensureTenantSchema, toast]);

  // Initial fetch when tenant schema is available
  useEffect(() => {
    if (tenantSchema) {
      fetchLeads();
      setupRealtimeSubscription();
    }
  }, [tenantSchema, fetchLeads, setupRealtimeSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, []);

  // Memoize the return object to prevent recreation
  return useMemo(() => ({
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshData,
    updateLead
  }), [leads, lossReasons, isLoading, fetchLeads, refreshData, updateLead]);
}
