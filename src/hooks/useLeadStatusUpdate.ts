
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

export function useLeadStatusUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateLeadStatus = async (
    leadId: string, 
    newStatus: string, 
    lossReason?: string
  ): Promise<boolean> => {
    try {
      setIsUpdating(true);
      
      // Preparar os dados para atualização
      const updateData: any = { status: newStatus };
      
      // Se está mudando para "Perdido", definir o motivo da perda
      if (newStatus === "Perdido" && lossReason) {
        updateData.loss_reason = lossReason;
      }
      
      // SEMPRE limpar o motivo da perda quando NÃO está indo para "Perdido"
      if (newStatus !== "Perdido") {
        updateData.loss_reason = null;
      }

      console.log('Atualizando lead com dados:', updateData);

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao atualizar status do lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Erro inesperado ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o status.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateLeadStatus,
    isUpdating
  };
}
