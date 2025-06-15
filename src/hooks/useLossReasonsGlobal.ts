import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";

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
let currentUserId: string | null = null; // Rastreia o usuário atual para o cache

// Função para notificar todos os subscribers sobre mudanças
const notifySubscribers = () => {
  console.log(`🔔 useLossReasonsGlobal - Notificando ${subscribers.size} subscribers sobre mudanças`);
  subscribers.forEach(callback => callback());
};

// Função para buscar dados do Supabase
const fetchFromSupabase = async (): Promise<LossReason[]> => {
  console.log(`🔄 useLossReasonsGlobal - Buscando motivos de perda do Supabase só do sistema e do tenant atual...`);

  const { data, error } = await supabase
    .from('loss_reasons')
    .select('*')
    .order('reason', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar motivos de perda:', error);
    throw error;
  }

  // 🔒 Filtro extra de segurança: só retornar motivos "do sistema" (user_id null) OU do tenant atual (currentUserId)
  // Isso impede que motivos de outros tenants apareçam na interface por acidente!
  const filteredData =
    (data ?? []).filter(item =>
      (item.user_id === null) ||
      (currentUserId && item.user_id === currentUserId)
    );

  // Debug: mostrar user_id dos motivos retornados
  filteredData.forEach(item => {
    console.log(`[DEBUG] Motivo lido: id=${item.id}, reason=${item.reason}, is_fixed=${item.is_fixed}, user_id=${item.user_id}`);
  });

  console.log(`✅ useLossReasonsGlobal - ${filteredData.length} motivos de perda filtrados (Sistema + tenant):`, filteredData);
  return filteredData;
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

  // Efeito para lidar com mudanças de autenticação e resetar o estado global
  useEffect(() => {
    const handleAuthChange = (session: Session | null) => {
      const newUserId = session?.user?.id ?? null;
      if (newUserId !== currentUserId) {
        console.log(`👤 useLossReasonsGlobal - Usuário alterado de ${currentUserId} para ${newUserId}. Resetando estado.`);
        currentUserId = newUserId;
        globalLossReasons = [];
        globalInitialized = false;
        globalLoading = true;
        notifySubscribers();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Este efeito roda apenas uma vez

  // Função de callback para atualizar o estado local quando o global mudar
  const updateLocalState = useCallback(() => {
    console.log(`🔄 useLossReasonsGlobal - Atualizando estado local. Global: ${globalLossReasons.length} motivos, Loading: ${globalLoading}`);
    setLocalLossReasons([...globalLossReasons]);
    setLocalLoading(globalLoading);
  }, []);

  // Registrar este componente como subscriber e buscar dados
  useEffect(() => {
    console.log(`📝 useLossReasonsGlobal - Registrando subscriber`);
    subscribers.add(updateLocalState);

    // Se não foi inicializado E temos um usuário, buscar dados
    if (!globalInitialized && currentUserId) {
      console.log(`🚀 useLossReasonsGlobal - Primeira inicialização ou reset para o usuário ${currentUserId}, buscando dados...`);
      updateGlobalState().catch(error => {
        console.error('❌ Erro ao carregar dados iniciais:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os motivos de perda.",
          variant: "destructive"
        });
      });
    } else {
      // Se já foi inicializado, ou não há usuário, apenas sincronizar o estado local
      console.log(`🔄 useLossReasonsGlobal - Já inicializado ou sem usuário, sincronizando estado local...`);
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

  // Função para atualizar leads que usam um motivo específico para "outros"
  const updateLeadsToOthers = useCallback(async (oldReason: string): Promise<boolean> => {
    console.log(`🔄 useLossReasonsGlobal - Atualizando leads que usam "${oldReason}" para "outros"`);
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ loss_reason: 'outros' })
        .eq('loss_reason', oldReason);

      if (error) {
        console.error('❌ Erro ao atualizar leads para "outros":', error);
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Leads atualizados com sucesso para "outros"`);
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar leads:', error);
      return false;
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
        console.log(`🔄 useLossReasonsGlobal - Motivo "${reasonToDelete.reason}" está em uso por ${leadsCount} leads. Atualizando para "outros"...`);
        
        // Atualizar todos os leads que usam este motivo para "outros"
        const updateSuccess = await updateLeadsToOthers(reasonToDelete.reason);
        
        if (!updateSuccess) {
          toast({
            title: "Erro",
            description: "Não foi possível atualizar os leads que usam este motivo.",
            variant: "destructive"
          });
          return false;
        }

        console.log(`✅ useLossReasonsGlobal - ${leadsCount} leads atualizados para "outros" com sucesso`);
      }

      // Excluir o motivo de perda
      console.log(`🗑️ useLossReasonsGlobal - Excluindo motivo "${reasonToDelete.reason}" do banco de dados...`);
      const { error: deleteError, status, statusText, data } = await supabase
        .from('loss_reasons')
        .delete()
        .eq('id', id);

      // Adicionar logs detalhados para depuração
      console.log("[DEBUG] Resposta ao deletar motivo:\n", {
        status,
        statusText,
        data,
        deleteError
      });

      if (deleteError) {
        // Inspecionar mensagem de erro para determinar causa provável
        const lowerMsg = (deleteError.message || "").toLowerCase();
        let possibleCause = "Erro ao excluir o motivo: " + deleteError.message;

        if (
          lowerMsg.includes("policy") ||
          lowerMsg.includes("rls") ||
          lowerMsg.includes("row level security") ||
          lowerMsg.includes("permission")
        ) {
          possibleCause = "Problema de permissão/RLS detectado ao tentar excluir. Detalhes: " + deleteError.message;
        } else if (
          lowerMsg.includes("constraint") ||
          lowerMsg.includes("foreign key")
        ) {
          possibleCause = "Violação de constraint: leads ainda dependem deste motivo. Detalhes: " + deleteError.message;
        }

        toast({
          title: "Erro",
          description: possibleCause,
          variant: "destructive"
        });
        // Deixar bem claro no console também
        console.error("[ERRO SUPABASE] Falha ao deletar loss_reason:", deleteError, {
          status,
          statusText,
          data
        });
        return false;
      }

      console.log(`✅ useLossReasonsGlobal - Motivo "${reasonToDelete.reason}" excluído do banco com sucesso`);
      
      // Atualizar estado global imediatamente
      await updateGlobalState();
      
      const successMessage = leadsCount > 0 
        ? `Motivo de perda excluído com sucesso. ${leadsCount} lead(s) foram alterados para "outros".`
        : "Motivo de perda excluído com sucesso.";
        
      toast({
        title: "Sucesso",
        description: successMessage,
      });
      return true;
    } catch (error: any) {
      // Exibir o erro detalhado para o usuário/admin
      let errorMsg: string = typeof error === "string" ? error : (error?.message ?? "Ocorreu um erro inesperado ao excluir o motivo.");
      toast({
        title: "Erro",
        description: "Erro inesperado: " + errorMsg,
        variant: "destructive"
      });
      console.error('[ERRO] Erro inesperado ao excluir motivo:', error);
      return false;
    }
  }, [toast, checkLeadsUsingReason, updateLeadsToOthers]);

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
