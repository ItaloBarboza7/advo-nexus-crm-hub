
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function useLeadStatusUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

  const updateLeadStatus = async (
    leadId: string, 
    newStatus: string, 
    lossReason?: string
  ): Promise<boolean> => {
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for status update');
      return false;
    }

    try {
      setIsUpdating(true);
      console.log(`🔄 useLeadStatusUpdate - Updating lead ${leadId} status to ${newStatus} in schema ${tenantSchema}`);
      
      // First get the current lead data
      const { data: currentLead, error: fetchError } = await supabase
        .from(`${tenantSchema}.leads`)
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (fetchError || !currentLead) {
        console.error('❌ Error fetching lead data:', fetchError);
        return false;
      }

      // Update the lead with the new status
      const { error } = await supabase
        .from(`${tenantSchema}.leads`)
        .update({
          status: newStatus,
          loss_reason: newStatus === "Perdido" ? lossReason : null
        })
        .eq('id', leadId);

      if (error) {
        console.error('❌ Error updating lead status:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useLeadStatusUpdate - Lead status updated successfully');
      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('❌ Unexpected error updating lead status:', error);
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
