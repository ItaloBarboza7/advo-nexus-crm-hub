
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { lossReasons } = useLossReasonsGlobal();

  // O Supabase RLS agora faz o isolamento automaticamente - sem filtros manuais!
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      console.log("📊 useLeadsData - Buscando leads (RLS automático)...");
      
      const { data, error, status } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar leads:', error, 'status:', status);
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      console.log(`✅ useLeadsData - ${transformedLeads.length} leads carregados (isolamento automático por RLS)`);
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
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

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
    fetchLeads();
  }, []);

  return {
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshData,
    updateLead
  };
}
