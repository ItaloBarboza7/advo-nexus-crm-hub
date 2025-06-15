
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Reason type includes is_fixed for system/user
export interface LossReasonRecord {
  id: string;
  reason: string;
  is_fixed: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseLossReasonsReturn {
  lossReasons: LossReasonRecord[];
  loading: boolean;
  addLossReason: (reason: string) => Promise<boolean>;
  updateLossReason: (id: string, newReason: string) => Promise<boolean>;
  deleteLossReason: (id: string) => Promise<boolean>;
  refreshData: () => void;
}

/**
 * Fetches all visible loss reasons for the current tenant,
 * hiding system reasons marked as hidden for this tenant.
 */
export function useLossReasonsGlobal(): UseLossReasonsReturn {
  const [lossReasons, setLossReasons] = useState<LossReasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLossReasons = useCallback(async () => {
    setLoading(true);

    // Forçar sempre buscar o dado atualizado, sem cache inicial/local
    // eslint-disable-next-line no-console
    console.log("🔄 fetchLossReasons - Buscando motivos de perda...");

    // Supabase types do not recognize custom RPCs, so we cast supabase as 'any' here.
    const { data, error } = await (supabase as any).rpc("get_visible_loss_reasons_for_tenant");

    if (error || !data) {
      // Fallback to older logic: show all reasons
      const { data: rawReasons, error: fallbackError } = await supabase
        .from("loss_reasons")
        .select("*")
        .order("created_at", { ascending: true });

      if (fallbackError) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os motivos de perda.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // eslint-disable-next-line no-console
      console.log("🟠 fetchLossReasons - Fallback para loss_reasons. Motivos carregados:", rawReasons);
      setLossReasons(rawReasons as LossReasonRecord[]);
      setLoading(false);
      return;
    }

    // eslint-disable-next-line no-console
    console.log("✅ fetchLossReasons - Motivos carregados:", data);

    // Supabase returns 'any' here, so we cast safely.
    setLossReasons(data as LossReasonRecord[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchLossReasons();
  }, [fetchLossReasons]);

  const refreshData = useCallback(() => {
    // Adicionado para debug detalhado
    // eslint-disable-next-line no-console
    console.log("🔄 refreshData - Atualizando a lista de motivos de perda...");
    fetchLossReasons();
  }, [fetchLossReasons]);

  // Adds a new loss reason for the current tenant (always user-specific)
  const addLossReason = async (reason: string) => {
    const { error } = await supabase
      .from("loss_reasons")
      .insert([{ reason, is_fixed: false }]); // user_id is set by DB trigger

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o motivo de perda.",
        variant: "destructive",
      });
      return false;
    }
    refreshData();
    return true;
  };

  // Updates a loss reason (only tenant-specific and editable)
  const updateLossReason = async (id: string, newReason: string) => {
    // Only allow updating tenant-owned, non-fixed reasons from the UI
    const { error } = await supabase
      .from("loss_reasons")
      .update({ reason: newReason })
      .eq("id", id)
      .eq("is_fixed", false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível editar o motivo de perda.",
        variant: "destructive",
      });
      return false;
    }
    refreshData();
    return true;
  };

  // Soft-delete logic for global reasons, hard-delete for local tenant reasons
  const deleteLossReason = async (id: string) => {
    // Fetch the reason to determine if it's global or user-owned
    const { data: reasonData, error: reasonError } = await supabase
      .from("loss_reasons")
      .select("id, user_id, is_fixed")
      .eq("id", id)
      .maybeSingle();

    if (reasonError || !reasonData) {
      toast({
        title: "Erro",
        description: "Motivo de perda não encontrado.",
        variant: "destructive",
      });
      return false;
    }

    const { user_id, is_fixed } = reasonData;

    // Case 1: User-owned (tenant), not fixed => hard delete
    if (user_id && !is_fixed) {
      const { error: delErr } = await supabase
        .from("loss_reasons")
        .delete()
        .eq("id", id);

      if (delErr) {
        toast({
          title: "Erro",
          description: "Não foi possível remover o motivo de perda.",
          variant: "destructive",
        });
        return false;
      }
      refreshData();
      return true;
    }

    // Case 2: Global (system), not fixed => soft-delete via hidden_default_items
    if (!user_id && !is_fixed) {
      // Verifique se o item já está oculto para evitar erro de duplicidade
      const { data: hiddenItem, error: hiddenFetchErr } = await supabase
        .from("hidden_default_items")
        .select("id")
        .eq("item_id", id)
        .eq("item_type", "loss_reason")
        .maybeSingle();

      if (hiddenFetchErr) {
        toast({
          title: "Erro",
          description: "Erro ao verificar ocultação do motivo de perda.",
          variant: "destructive",
        });
        return false;
      }

      if (hiddenItem) {
        // Já está oculto, trata como sucesso
        toast({
          title: "Motivo de perda já estava oculto",
          description: "O motivo de perda já estava oculto para este tenant.",
          variant: "default",
        });
        // Forçar refetch depois, pois pode ser atualização assíncrona do cache do supabase
        setTimeout(() => {
          refreshData();
        }, 350); // Adicionado delay para garantir propagação do banco
        return true;
      }

      // Insere o hidden_default_item, agora com segurança
      const { error: hideErr } = await supabase
        .from("hidden_default_items")
        .insert({
          item_id: id,
          item_type: "loss_reason",
        });

      if (hideErr) {
        // Se for violação de constraint, trata como sucesso (precaução extra)
        if (
          hideErr.code === "23505" ||
          (hideErr.message && hideErr.message.includes("duplicate"))
        ) {
          toast({
            title: "Motivo de perda já estava oculto (duplicidade)",
            description: "O motivo de perda já estava oculto para este tenant.",
            variant: "default",
          });
          // Forçar refetch depois, pois pode ser atualização assíncrona do cache do supabase
          setTimeout(() => {
            refreshData();
          }, 350); // delay para evitar race condition de leitura x escrita
          return true;
        }
        toast({
          title: "Erro",
          description:
            "Não foi possível ocultar o motivo de perda padrão do sistema.",
          variant: "destructive",
        });
        return false;
      }
      // Forçar refetch após ocultação
      setTimeout(() => {
        refreshData();
      }, 350);
      return true;
    }

    // Fixed system reasons cannot be deleted
    toast({
      title: "Erro",
      description: "Motivo de perda do sistema não pode ser excluído.",
      variant: "destructive",
    });
    return false;
  };

  return {
    lossReasons,
    loading,
    addLossReason,
    updateLossReason,
    deleteLossReason,
    refreshData,
  };
}

