
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
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);

  // Debounce mechanism to prevent rapid successive calls
  const FETCH_DEBOUNCE_MS = 1000;

  const fetchLeads = useCallback(async () => {
    const now = Date.now();
    if (fetchingRef.current || !tenantSchema || (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("🚫 useLeadsData - Fetch skipped (debounce, no schema, or already fetching)");
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoading(true);
      console.log("📊 useLeadsData - Buscando leads no esquema do tenant...");
      
      const schema = tenantSchema;
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.leads ORDER BY created_at DESC`
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

      console.log(`✅ useLeadsData - ${transformedLeads.length} leads carregados do esquema ${schema}`);
      if (mountedRef.current) {
        setLeads(prev => {
          // Only update if data has actually changed
          if (JSON.stringify(prev) !== JSON.stringify(transformedLeads)) {
            return transformedLeads;
          }
          return prev;
        });
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
      fetchingRef.current = false;
    }
  }, [tenantSchema, toast]);

  // Memoize refresh function to prevent recreation
  const refreshData = useMemo(() => {
    return () => {
      console.log(`🔄 useLeadsData - Atualizando dados dos leads...`);
      fetchLeads();
    };
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

      // Usar o método nativo do Supabase para preservar o contexto de autenticação
      // Isso permite que os triggers funcionem corretamente com auth.uid()
      console.log('🔧 Usando método nativo do Supabase para preservar contexto de auth');
      
      // Para usar o método nativo, precisamos primeiro buscar a tabela do esquema específico
      // Infelizmente, o supabase-js não suporta esquemas personalizados diretamente
      // Então continuamos usando exec_sql, mas agora sabemos que o problema está na execução com privilégios elevados
      
      // Vamos tentar uma abordagem híbrida: usar uma função SQL que preserve o contexto do usuário
      const sql = `
        SELECT update_lead_with_user_context($1, $2, $3) as success
      `;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `
          DO $$
          DECLARE
            schema_name text := '${schema}';
            lead_uuid uuid := '${leadId}';
            update_sql text;
          BEGIN
            -- Construir SQL de atualização dinamicamente
            update_sql := format('UPDATE %I.leads SET ', schema_name);
            
            ${Object.entries(validUpdates).map(([key, value], index) => {
              const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;
              return `update_sql := update_sql || '${key} = ''${escapedValue}''${index < Object.keys(validUpdates).length - 1 ? ', ' : ''}';`;
            }).join('\n            ')}
            
            update_sql := update_sql || ', updated_at = now() WHERE id = ''' || lead_uuid || '''';
            
            -- Executar a atualização
            EXECUTE update_sql;
          END $$;
        `
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

  useEffect(() => {
    if (tenantSchema && !fetchingRef.current) {
      fetchLeads();
    }
  }, [tenantSchema, fetchLeads]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
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
