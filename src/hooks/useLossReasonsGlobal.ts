
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAndUnhideDefaultLossReason } from "@/utils/lossReasonUtils";

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
  deleteLossReason: (id: string) => Promise<boolean>;
  refreshData: () => void;
}

export function useLossReasonsGlobal(): UseLossReasonsReturn {
  const [lossReasons, setLossReasons] = useState<LossReasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchLossReasons = useCallback(async () => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);

      console.log("🔄 fetchLossReasons - Buscando motivos de perda...");

      const { data, error } = await (supabase as any).rpc("get_visible_loss_reasons_for_tenant");

      if (error || !data) {
        console.error("❌ fetchLossReasons - Erro ao buscar via RPC:", error);
        if (mountedRef.current) {
          setLossReasons([]);
        }
        return;
      }

      console.log("✅ fetchLossReasons - Motivos carregados:", data);
      if (mountedRef.current) {
        setLossReasons(data as LossReasonRecord[]);
      }
    } catch (error) {
      console.error("❌ fetchLossReasons - Erro inesperado:", error);
      if (mountedRef.current) {
        setLossReasons([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, []);

  const refreshData = useCallback(() => {
    console.log("🔄 refreshData - Atualizando a lista de motivos de perda...");
    fetchLossReasons();
  }, [fetchLossReasons]);

  const addLossReason = useCallback(async (reason: string) => {
    // Check if we should unhide a default reason instead of creating a new one
    const { shouldCreate, reasonId } = await checkAndUnhideDefaultLossReason(reason);
    
    if (!shouldCreate) {
      // Reason was unhidden successfully - no message needed
      refreshData();
      return true;
    }

    // Create a new reason if no hidden default was found
    const { error } = await supabase
      .from("loss_reasons")
      .insert([{ reason, is_fixed: false }]);

    if (error) {
      return false;
    }
    refreshData();
    return true;
  }, [refreshData]);

  const deleteLossReason = useCallback(async (id: string) => {
    const { data: reasonData, error: reasonError } = await supabase
      .from("loss_reasons")
      .select("id, user_id, is_fixed")
      .eq("id", id)
      .maybeSingle();

    if (reasonError || !reasonData) {
      return false;
    }

    const { user_id, is_fixed } = reasonData;

    if (user_id && !is_fixed) {
      const { error: delErr } = await supabase
        .from("loss_reasons")
        .delete()
        .eq("id", id);

      if (delErr) {
        return false;
      }
      refreshData();
      return true;
    }

    if (!user_id && !is_fixed) {
      const { data: hiddenItem, error: hiddenFetchErr } = await supabase
        .from("hidden_default_items")
        .select("id")
        .eq("item_id", id)
        .eq("item_type", "loss_reason")
        .maybeSingle();

      if (hiddenFetchErr) {
        return false;
      }

      if (hiddenItem) {
        // Already hidden - just refresh without showing message
        setTimeout(() => {
          refreshData();
        }, 350);
        return true;
      }

      const { error: hideErr } = await supabase
        .from("hidden_default_items")
        .insert({
          item_id: id,
          item_type: "loss_reason",
        });

      if (hideErr) {
        if (
          hideErr.code === "23505" ||
          (hideErr.message && hideErr.message.includes("duplicate"))
        ) {
          // Already hidden - just refresh without showing message
          setTimeout(() => {
            refreshData();
          }, 350);
          return true;
        }
        return false;
      }
      setTimeout(() => {
        refreshData();
      }, 350);
      return true;
    }

    return false;
  }, [refreshData]);

  useEffect(() => {
    fetchLossReasons();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    lossReasons,
    loading,
    addLossReason,
    deleteLossReason,
    refreshData,
  };
}
