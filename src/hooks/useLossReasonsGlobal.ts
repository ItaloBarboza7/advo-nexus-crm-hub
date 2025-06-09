
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
    console.log(`📋 useLossReasonsGlobal - Motivos atuais:`, globalLossReasons.map(r => `${r.reason} (ID: ${r.id})`));
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
    console.log(`🔄 useLossReasonsGlobal - Atualizando estado local. Global: ${globalLossReasons.length} motivos, Loading: ${globalLoading}, Initialized: ${globalInitialized}`);
    console.log(`📋 useLossReasonsGlobal - Motivos globais para sincronizar:`, globalLossReasons.map(r => `${r.reason} (ID: ${r.id})`));
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

  // Função para adicionar um novo motivo (atualiza globalmente)
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

  // Função para atualizar um motivo (atualiza globalmente)
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

  // Função para excluir um motivo (atualiza globalmente)
  const deleteLossReason = useCallback(async (id: string) => {
    console.log(`🗑️ useLossReasonsGlobal - Excluindo motivo ID: ${id}`);
    
    const reasonToDelete = globalLossReasons.find(reason => reason.id === id);
    console.log(`🔍 Motivo a ser excluído:`, reasonToDelete);

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
      toast({
        title: "Erro",
        description: "Este motivo não pode ser excluído pois é um motivo base do sistema.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log(`🔄 useLossReasonsGlobal - Tentando excluir motivo "${reasonToDelete.reason}" (ID: ${id}) do banco de dados...`);
      
      // Verificar se existem leads usando este motivo
      const { data: leadsUsingReason, error: leadsError } = await supabase
        .from('leads')
        .select('id, name')
        .eq('loss_reason', reasonToDelete.reason);

      if (leadsError) {
        console.error('❌ Erro ao verificar leads vinculados:', leadsError);
        toast({
          title: "Erro",
          description: "Erro ao verificar dependências do motivo.",
          variant: "destructive"
        });
        return false;
      }

      if (leadsUsingReason && leadsUsingReason.length > 0) {
        console.log(`🔄 useLossReasonsGlobal - Encontrados ${leadsUsingReason.length} leads usando este motivo. Atualizando para "Outros"...`);
        
        // Atualizar todos os leads que usam este motivo para "Outros"
        const { error: updateError } = await supabase
          .from('leads')
          .update({ loss_reason: 'Outros' })
          .eq('loss_reason', reasonToDelete.reason);

        if (updateError) {
          console.error('❌ Erro ao atualizar leads para "Outros":', updateError);
          toast({
            title: "Erro",
            description: "Erro ao atualizar leads vinculados ao motivo.",
            variant: "destructive"
          });
          return false;
        }

        console.log(`✅ useLossReasonsGlobal - ${leadsUsingReason.length} leads atualizados para "Outros" com sucesso`);
        
        toast({
          title: "Leads atualizados",
          description: `${leadsUsingReason.length} leads foram atualizados para usar o motivo "Outros".`,
        });
      } else {
        console.log(`✅ Nenhum lead está usando este motivo. Procedendo com a exclusão...`);
      }
      
      // Fazer a exclusão no banco de dados
      const { error: deleteError, count } = await supabase
        .from('loss_reasons')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao excluir motivo no banco:', deleteError);
        toast({
          title: "Erro",
          description: `Não foi possível excluir o motivo de perda: ${deleteError.message}`,
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Motivo "${reasonToDelete.reason}" excluído do banco. Linhas afetadas: ${count}`);
      
      if (count === 0) {
        console.warn(`⚠️ Nenhuma linha foi excluída. O motivo pode já ter sido removido.`);
        toast({
          title: "Aviso",
          description: "O motivo pode já ter sido removido.",
          variant: "default"
        });
      }
      
      // Atualizar o estado global após exclusão - FORÇAR REFRESH COMPLETO
      console.log(`🔄 useLossReasonsGlobal - Atualizando estado global após exclusão...`);
      await updateGlobalState();
      
      console.log(`✅ useLossReasonsGlobal - Exclusão e sincronização concluídas com sucesso`);
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
  }, [toast]);

  console.log(`🔍 useLossReasonsGlobal - Hook retornando ${localLossReasons.length} motivos:`, localLossReasons.map(r => `${r.reason} (ID: ${r.id})`));

  return {
    lossReasons: localLossReasons,
    loading: localLoading,
    refreshData,
    addLossReason,
    updateLossReason,
    deleteLossReason
  };
}
