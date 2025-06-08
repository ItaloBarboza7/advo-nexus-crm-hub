
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LossReason {
  id: string;
  reason: string;
}

export function useLossReasons() {
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLossReasons = async () => {
    try {
      console.log(`🔄 useLossReasons - Buscando motivos de perda...`);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar motivos de perda:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os motivos de perda.",
          variant: "destructive"
        });
        return;
      }

      console.log(`✅ useLossReasons - ${data?.length || 0} motivos de perda carregados:`, data);
      setLossReasons(data || []);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar motivos de perda:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os motivos de perda.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLossReasons();
  }, []);

  const refreshData = async () => {
    console.log(`🔄 useLossReasons - Forçando atualização dos dados...`);
    await fetchLossReasons();
  };

  return {
    lossReasons,
    loading,
    refreshData
  };
}
