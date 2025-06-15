
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

  // Aqui não precisa mais filtrar user_id, pois o Supabase RLS já faz o isolamento!
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error, status } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error, 'status:', status);
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Nada de filtro manual por user_id!
      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      console.log(`📊 useLeadsData - ${transformedLeads.length} leads carregados`);
      setLeads(transformedLeads);
    } catch (error: any) {
      console.error('Erro inesperado ao buscar leads:', error);
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

  // Atualizar um lead específico
  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      console.log(`📝 useLeadsData - Atualizando lead ${leadId}:`, updates);
      
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao atualizar lead:', error);
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
      console.error('Erro inesperado ao atualizar lead:', error);
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
    lossReasons, // Agora vem do hook global com is_fixed
    isLoading,
    fetchLeads,
    refreshData,
    updateLead
  };
}

