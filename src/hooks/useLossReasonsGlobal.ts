
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LossReason {
  id: string;
  reason: string;
  is_fixed: boolean;
}

// Estado global compartilhado entre todos os componentes
let globalLossReasons: LossReason[] = [];
let globalLoading = true;
let globalInitialized = false;
const subscribers = new Set<() => void>();

// Função para notificar todos os subscribers sobre mudanças
const notifySubscribers = () => {
  console.log(`🔔 useLossReasonsGlobal - Notificando ${subscribers.size} subscribers sobre mudanças`);
  subscribers.forEach(callback => callback());
};

// Função para buscar dados do Supabase
const fetchFromSupabase = async (): Promise<LossReason[]> => {
  console.log(`🔄 useLossReasonsGlobal - Buscando motivos de perda do Supabase...`);
  
  const { data, error } = await supabase
    .from('loss_reasons')
    .select('*')
    .order('reason', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar motivos de perda:', error);
    throw error;
  }

  console.log(`✅ useLossReasonsGlobal - ${data?.length || 0} motivos de perda carregados:`, data);
  return data || [];
};

// Função para atualizar o estado global
const updateGlobalState = async () => {
  try {
    console.log(`🔄 useLossReasonsGlobal - Iniciando atualização do estado global...`);
    globalLoading = true;
    notifySubscribers();
    
    const newData = await fetchFromSupabase();
    globalLossReasons = newData;
    globalLoading = false;
    globalInitialized = true;
    
    console.log(`✅ useLossReasonsGlobal - Estado global atualizado com ${globalLossReasons.length} motivos`);
    notifySubscribers();
  } catch (error) {
    globalLoading = false;
    globalInitialized = true;
    console.error('❌ Erro ao atualizar estado global:', error);
    notifySubscribers();
    throw error;
  }
};

// Hook principal que será usado por todos os componentes
export function useLossReasonsGlobal() {
  const [localLossReasons, setLocalLossReasons] = useState<LossReason[]>(globalLossReasons);
  const [localLoading, setLocalLoading] = useState(globalLoading);
  const { toast } = useToast();

  // Função de callback para atualizar o estado local quando o global mudar
  const updateLocalState = useCallback(() => {
    console.log(`🔄 useLossReasonsGlobal - Atualizando estado local. Global: ${globalLossReasons.length} motivos, Loading: ${globalLoading}`);
    setLocalLossReasons([...globalLossReasons]);
    setLocalLoading(globalLoading);
  }, []);

  // Registrar este componente como subscriber
  useEffect(() => {
    console.log(`📝 useLossReasonsGlobal - Registrando subscriber`);
    subscribers.add(updateLocalState);
    
    // Se ainda não foi inicializado, buscar dados
    if (!globalInitialized) {
      console.log(`🚀 useLossReasonsGlobal - Primeira inicialização, buscando dados...`);
      updateGlobalState().catch(error => {
        console.error('❌ Erro ao carregar dados iniciais:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os motivos de perda.",
          variant: "destructive"
        });
      });
    } else {
      // Se já foi inicializado, apenas sincronizar o estado local
      console.log(`🔄 useLossReasonsGlobal - Já inicializado, sincronizando estado local...`);
      updateLocalState();
    }

    return () => {
      console.log(`🗑️ useLossReasonsGlobal - Removendo subscriber`);
      subscribers.delete(updateLocalState);
    };
  }, [updateLocalState, toast]);

  // Função para forçar refresh global
  const refreshData = useCallback(async () => {
    console.log(`🔄 useLossReasonsGlobal - Forçando atualização global dos dados...`);
    try {
      await updateGlobalState();
      console.log(`✅ useLossReasonsGlobal - Refresh global concluído`);
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os motivos de perda.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Função para adicionar um novo motivo
  const addLossReason = useCallback(async (reason: string) => {
    console.log(`➕ useLossReasonsGlobal - Adicionando novo motivo: ${reason}`);
    try {
      const { error } = await supabase
        .from('loss_reasons')
        .insert({ reason: reason.trim(), is_fixed: false });

      if (error) {
        console.error('❌ Erro ao adicionar motivo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o motivo de perda.",
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Motivo "${reason}" inserido no banco. Atualizando estado global...`);
      await updateGlobalState();
      
      toast({
        title: "Sucesso",
        description: "Motivo de perda adicionado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar motivo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Função para atualizar um motivo
  const updateLossReason = useCallback(async (id: string, newReason: string) => {
    console.log(`📝 useLossReasonsGlobal - Atualizando motivo ID: ${id} para: ${newReason}`);
    
    // Verificar se o motivo é fixo
    const reasonToUpdate = globalLossReasons.find(r => r.id === id);
    if (reasonToUpdate?.is_fixed) {
      toast({
        title: "Erro",
        description: "Este motivo não pode ser editado pois é um motivo base do sistema.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('loss_reasons')
        .update({ reason: newReason.trim() })
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao atualizar motivo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o motivo de perda.",
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Motivo atualizado no banco com sucesso. Atualizando estado global...`);
      await updateGlobalState();
      
      toast({
        title: "Sucesso",
        description: "Motivo de perda atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar motivo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Função para verificar se há leads usando um motivo
  const checkLeadsUsingReason = useCallback(async (reason: string): Promise<number> => {
    console.log(`🔍 useLossReasonsGlobal - Verificando leads que usam o motivo "${reason}"`);
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('loss_reason', reason);

      if (error) {
        console.error('❌ Erro ao verificar leads:', error);
        throw error;
      }

      const count = data?.length || 0;
      console.log(`📊 useLossReasonsGlobal - Encontrados ${count} leads usando o motivo "${reason}"`);
      return count;
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar leads:', error);
      return 0;
    }
  }, []);

  // Função para excluir um motivo
  const deleteLossReason = useCallback(async (id: string) => {
    console.log(`🗑️ useLossReasonsGlobal - Iniciando exclusão do motivo ID: ${id}`);
    
    const reasonToDelete = globalLossReasons.find(reason => reason.id === id);
    if (!reasonToDelete) {
      console.error(`❌ Motivo com ID ${id} não encontrado na lista global`);
      toast({
        title: "Erro",
        description: "Motivo não encontrado.",
        variant: "destructive"
      });
      return false;
    }

    // Verificar se é um motivo fixo
    if (reasonToDelete.is_fixed) {
      console.log(`⚠️ useLossReasonsGlobal - Tentativa de excluir motivo fixo: ${reasonToDelete.reason}`);
      toast({
        title: "Erro",
        description: "Este motivo não pode ser excluído pois é um motivo base do sistema.",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Verificar se há leads usando este motivo
      const leadsCount = await checkLeadsUsingReason(reasonToDelete.reason);
      
      if (leadsCount > 0) {
        console.log(`⚠️ useLossReasonsGlobal - Motivo "${reasonToDelete.reason}" está em uso por ${leadsCount} leads`);
        toast({
          title: "Não é possível excluir",
          description: `Este motivo está sendo usado por ${leadsCount} lead(s). Para excluir, primeiro altere o motivo destes leads.`,
          variant: "destructive"
        });
        return false;
      }

      // Excluir o motivo de perda
      console.log(`🗑️ useLossReasonsGlobal - Excluindo motivo "${reasonToDelete.reason}" do banco de dados...`);
      const { error: deleteError } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir motivo no banco:', deleteError);
        toast({
          title: "Erro",
          description: `Erro ao excluir o motivo: ${deleteError.message}`,
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Motivo "${reasonToDelete.reason}" excluído do banco com sucesso`);
      
      // Atualizar estado global imediatamente
      await updateGlobalState();
      
      toast({
        title: "Sucesso",
        description: "Motivo de perda excluído com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir motivo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o motivo.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast, checkLeadsUsingReason]);

  console.log(`🔍 useLossReasonsGlobal - Hook retornando ${localLossReasons.length} motivos`);

  return {
    lossReasons: localLossReasons,
    loading: localLoading,
    refreshData,
    addLossReason,
    updateLossReason,
    deleteLossReason
  };
}
