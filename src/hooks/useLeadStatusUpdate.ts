
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TenantLead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  description: string | null;
  source: string | null;
  state: string | null;
  status: string;
  action_group: string | null;
  action_type: string | null;
  loss_reason: string | null;
  value: number | null;
  user_id: string;
  closed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

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
      console.log(`🔄 useLeadStatusUpdate - Updating lead ${leadId} status to ${newStatus} using secure function...`);
      
      // First get the current lead data
      const { data: leads, error: fetchError } = await supabase.rpc('get_tenant_leads');
      
      if (fetchError) {
        console.error('❌ Error fetching lead data:', fetchError);
        return false;
      }

      const currentLead = (leads as TenantLead[] || []).find((lead) => lead.id === leadId);
      
      if (!currentLead) {
        console.error('❌ Lead not found');
        return false;
      }

      // Update the lead with the new status
      const { data: success, error } = await supabase.rpc('update_tenant_lead', {
        p_lead_id: leadId,
        p_name: currentLead.name,
        p_email: currentLead.email,
        p_phone: currentLead.phone,
        p_state: currentLead.state,
        p_source: currentLead.source,
        p_status: newStatus,
        p_action_group: currentLead.action_group,
        p_action_type: currentLead.action_type,
        p_value: currentLead.value,
        p_description: currentLead.description,
        p_loss_reason: newStatus === "Perdido" ? lossReason : null
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
