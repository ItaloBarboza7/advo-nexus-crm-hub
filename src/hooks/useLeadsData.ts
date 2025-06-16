
import { useState, useEffect } from "react";
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

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      console.log("📊 useLeadsData - Buscando leads no esquema do tenant...");
      
      // Garantir que o esquema do tenant existe
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      // Buscar leads no esquema do tenant usando SQL customizado
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.leads ORDER BY created_at DESC`
      });

      if (error) {
        console.error('❌ Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      const leadsData = Array.isArray(data) ? data : [];
      const transformedLeads: Lead[] = leadsData.map((lead: any) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      console.log(`✅ useLeadsData - ${transformedLeads.length} leads carregados do esquema ${schema}`);
      setLeads(transformedLeads);
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    console.log(`🔄 useLeadsData - Atualizando dados dos leads...`);
    fetchLeads();
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      console.log(`📝 useLeadsData - Atualizando lead ${leadId}:`, updates);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // Construir a query de update
      const setClause = Object.keys(updates)
        .map(key => `${key} = '${updates[key as keyof Lead]}'`)
        .join(', ');

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `UPDATE ${schema}.leads SET ${setClause}, updated_at = now() WHERE id = '${leadId}'`
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

      // Atualizar a lista local
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...updates } : lead
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
  };

  useEffect(() => {
    if (tenantSchema) {
      fetchLeads();
    }
  }, [tenantSchema]);

  return {
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshData,
    updateLead
  };
}
