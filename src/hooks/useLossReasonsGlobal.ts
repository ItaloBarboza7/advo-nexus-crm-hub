
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

    // Custom SQL to support filtering global reasons hidden by the current tenant.
    // This logic matches the example in the migration notes.
    const { data, error } = await supabase.rpc("get_visible_loss_reasons_for_tenant");

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
      setLossReasons(rawReasons as LossReasonRecord[]);
      setLoading(false);
      return;
    }
    setLossReasons(data as LossReasonRecord[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchLossReasons();
  }, [fetchLossReasons]);

  const refreshData = useCallback(() => {
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
      // Insert a row into hidden_default_items for this loss_reason
      const { error: hideErr } = await supabase
        .from("hidden_default_items")
        .insert({
          item_id: id,
          item_type: "loss_reason",
        });

      if (hideErr) {
        toast({
          title: "Erro",
          description:
            "Não foi possível ocultar o motivo de perda padrão do sistema.",
          variant: "destructive",
        });
        return false;
      }
      refreshData();
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

