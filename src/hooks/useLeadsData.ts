
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { dispatchLossReasonUpdate } from "@/utils/lossReasonEvents";

interface LossReason {
  id: string;
  reason: string;
}

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLossReasons = async () => {
    try {
      console.log('🔄 [useLeadsData] Buscando motivos de perda...');
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('❌ [useLeadsData] Erro ao buscar motivos de perda:', error);
        return;
      }

      console.log('✅ [useLeadsData] Motivos de perda carregados:', data?.length || 0);
      setLossReasons(data || []);
      
      // Disparar evento global para sincronizar outras fontes
      dispatchLossReasonUpdate();
    } catch (error) {
      console.error('❌ [useLeadsData] Erro inesperado ao buscar motivos de perda:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our Lead type by adding missing fields
      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined, // Handle optional fields that don't exist in database
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      setLeads(transformedLeads);
    } catch (error) {
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

  // Função para recarregar apenas os motivos de perda
  const refreshLossReasons = async () => {
    console.log('🔄 [useLeadsData] refreshLossReasons chamado - atualizando motivos de perda...');
    await fetchLossReasons();
  };

  // Função para adicionar um novo motivo de perda
  const addLossReason = async (reason: string) => {
    try {
      console.log('➕ [useLeadsData] Adicionando novo motivo de perda:', reason);
      
      const { error } = await supabase
        .from('loss_reasons')
        .insert({ reason: reason.trim() });

      if (error) {
        console.error('❌ [useLeadsData] Erro ao adicionar motivo de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o novo motivo.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ [useLeadsData] Motivo de perda adicionado com sucesso');
      toast({
        title: "Sucesso",
        description: "Novo motivo adicionado com sucesso.",
      });

      await fetchLossReasons();
      return true;
    } catch (error) {
      console.error('❌ [useLeadsData] Erro inesperado ao adicionar motivo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Função para excluir um motivo de perda
  const deleteLossReason = async (lossReasonId: string, lossReasonName: string) => {
    try {
      console.log('🗑️ [useLeadsData] Excluindo motivo de perda:', lossReasonName);

      const { error } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', lossReasonId);

      if (error) {
        console.error('❌ [useLeadsData] Erro ao excluir motivo de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o motivo de perda.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ [useLeadsData] Motivo de perda excluído com sucesso');
      
      toast({
        title: "Sucesso",
        description: `Motivo "${lossReasonName}" excluído com sucesso.`,
      });

      await fetchLossReasons();
      return true;
    } catch (error) {
      console.error('❌ [useLeadsData] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLossReasons();
    fetchLeads();
  }, []);

  return {
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshLossReasons,
    addLossReason,
    deleteLossReason
  };
}
