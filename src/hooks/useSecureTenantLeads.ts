
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types/lead';

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

export function useSecureTenantLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("📊 useSecureTenantLeads - Fetching leads using secure function...");
      
      const { data, error } = await supabase.rpc('get_tenant_leads');
      
      if (error) {
        console.error('❌ Error fetching leads:', error);
        setError(error.message);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      const transformedLeads: Lead[] = (data as TenantLead[] || []).map((lead) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
      }));

      console.log(`✅ useSecureTenantLeads - ${transformedLeads.length} leads loaded securely`);
      setLeads(transformedLeads);
    } catch (error: any) {
      console.error('❌ Unexpected error fetching leads:', error);
      setError(error.message || 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createLead = useCallback(async (leadData: {
    name: string;
    email?: string;
    phone: string;
    description?: string;
    source?: string;
    state?: string;
    action_group?: string;
    action_type?: string;
    value?: number;
  }): Promise<string | null> => {
    try {
      setIsLoading(true);
      console.log("🔄 useSecureTenantLeads - Creating lead using secure function...");
      
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
        return null;
      }

      console.log('✅ useSecureTenantLeads - Lead created successfully:', leadId);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      
      // Refresh leads list
      await fetchLeads();
      
      return leadId as string;
    } catch (error: any) {
      console.error('❌ Unexpected error creating lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar o lead.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchLeads]);

  const updateLead = useCallback(async (leadId: string, leadData: {
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
  }): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`🔄 useSecureTenantLeads - Updating lead ${leadId} using secure function...`);
      
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
        console.error('❌ Error updating lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useSecureTenantLeads - Lead updated successfully');
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });
      
      // Refresh leads list
      await fetchLeads();
      
      return true;
    } catch (error: any) {
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
  }, [toast, fetchLeads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    isLoading,
    error,
    fetchLeads,
    createLead,
    updateLead
  };
}
