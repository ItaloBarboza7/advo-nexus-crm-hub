
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

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
  const { tenantSchema } = useTenantSchema();

  const createLead = async (leadData: LeadCreateData): Promise<boolean> => {
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for create');
      return false;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Creating lead in schema ${tenantSchema}...`);
      
      const { data, error } = await supabase
        .from(`${tenantSchema}.leads`)
        .insert([{
          name: leadData.name,
          email: leadData.email || null,
          phone: leadData.phone,
          description: leadData.description || null,
          source: leadData.source || null,
          state: leadData.state || null,
          action_group: leadData.action_group || null,
          action_type: leadData.action_type || null,
          value: leadData.value || null,
          status: 'Novo'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useTenantLeadOperations - Lead created successfully:', data.id);
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
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for update');
      return false;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Updating lead ${leadId} in schema ${tenantSchema}...`);
      
      const { error } = await supabase
        .from(`${tenantSchema}.leads`)
        .update({
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          state: leadData.state,
          source: leadData.source,
          status: leadData.status,
          action_group: leadData.action_group,
          action_type: leadData.action_type,
          value: leadData.value,
          description: leadData.description,
          loss_reason: leadData.loss_reason
        })
        .eq('id', leadId);

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
