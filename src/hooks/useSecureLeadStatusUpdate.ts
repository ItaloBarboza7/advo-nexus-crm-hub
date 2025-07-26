
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function useSecureLeadStatusUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

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
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for status update');
      return false;
    }

    try {
      setIsUpdating(true);
      console.log(`🔄 useSecureLeadStatusUpdate - Updating lead ${leadId} in schema ${tenantSchema}...`);
      
      const { error } = await supabase
        .from(`${tenantSchema}.leads`)
        .update({
          name: leadData.name,
          email: leadData.email || null,
          phone: leadData.phone,
          state: leadData.state || null,
          source: leadData.source || null,
          status: leadData.status,
          action_group: leadData.action_group || null,
          action_type: leadData.action_type || null,
          value: leadData.value || null,
          description: leadData.description || null,
          loss_reason: leadData.loss_reason || null
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
