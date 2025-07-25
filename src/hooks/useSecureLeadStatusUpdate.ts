
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useSecureLeadStatusUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateLeadStatus = async (
    leadId: string, 
    leadData: {
      name: string;
      email?: string;
      phone: string;
      state?: string;
      source?: string;
      status: string;
      action_group?: string;
      action_type?: string;
      value?: number;
      description?: string;
      loss_reason?: string;
    }
  ): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`🔄 useSecureLeadStatusUpdate - Updating lead ${leadId} using secure function...`);
      
      const { data: success, error } = await supabase.rpc('update_tenant_lead', {
        p_lead_id: leadId,
        p_name: leadData.name,
        p_email: leadData.email || null,
        p_phone: leadData.phone,
        p_state: leadData.state || null,
        p_source: leadData.source || null,
        p_status: leadData.status,
        p_action_group: leadData.action_group || null,
        p_action_type: leadData.action_type || null,
        p_value: leadData.value || null,
        p_description: leadData.description || null,
        p_loss_reason: leadData.loss_reason || null
      });

      if (error) {
        console.error('❌ Error updating lead status:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useSecureLeadStatusUpdate - Lead status updated successfully');
      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso.",
      });

      return true;
    } catch (error: any) {
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
