
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeadUpdateData {
  name: string;
  email: string | null;
  phone: string;
  state: string | null;
  source: string | null;
  status: string;
  action_group: string | null;
  action_type: string | null;
  value: number | null;
  description: string | null;
  loss_reason: string | null;
}

interface LeadCreateData {
  name: string;
  email?: string;
  phone: string;
  state?: string;
  source?: string;
  action_group?: string;
  action_type?: string;
  value?: number;
  description?: string;
}

export function useTenantLeadOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createLead = async (leadData: LeadCreateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Creating lead using secure function...`);
      
      const { data: leadId, error } = await supabase.rpc('create_tenant_lead', {
        p_name: leadData.name,
        p_email: leadData.email || null,
        p_phone: leadData.phone,
        p_description: leadData.description || null,
        p_source: leadData.source || null,
        p_state: leadData.state || null,
        p_action_group: leadData.action_group || null,
        p_action_type: leadData.action_type || null,
        p_value: leadData.value || null
      });

      if (error) {
        console.error('❌ Error creating lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useTenantLeadOperations - Lead created successfully:', leadId);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Unexpected error creating lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (leadId: string, leadData: LeadUpdateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Updating lead ${leadId} using secure function...`);
      
      const { data: success, error } = await supabase.rpc('update_tenant_lead', {
        p_lead_id: leadId,
        p_name: leadData.name,
        p_email: leadData.email,
        p_phone: leadData.phone,
        p_state: leadData.state,
        p_source: leadData.source,
        p_status: leadData.status,
        p_action_group: leadData.action_group,
        p_action_type: leadData.action_type,
        p_value: leadData.value,
        p_description: leadData.description,
        p_loss_reason: leadData.loss_reason
      });

      if (error) {
        console.error('❌ Error updating lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useTenantLeadOperations - Lead updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Unexpected error updating lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createLead,
    updateLead,
    isLoading
  };
}
