
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types/lead';
import { useTenantSchema } from '@/hooks/useTenantSchema';

export function useSecureTenantLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

  const fetchLeads = useCallback(async () => {
    if (!tenantSchema) {
      console.log("🚫 useSecureTenantLeads - No tenant schema available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("📊 useSecureTenantLeads - Fetching leads from tenant schema:", tenantSchema);
      
      const { data, error } = await supabase
        .from(`${tenantSchema}.leads`)
        .select('*')
        .order('created_at', { ascending: false });
      
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

      const transformedLeads: Lead[] = (data || []).map((lead: any) => ({
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
  }, [toast, tenantSchema]);

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
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for create');
      return null;
    }

    try {
      setIsLoading(true);
      console.log("🔄 useSecureTenantLeads - Creating lead in schema:", tenantSchema);
      
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
        return null;
      }

      console.log('✅ useSecureTenantLeads - Lead created successfully:', data.id);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      
      // Refresh leads list
      await fetchLeads();
      
      return data.id;
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
  }, [toast, fetchLeads, tenantSchema]);

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
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for update');
      return false;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 useSecureTenantLeads - Updating lead ${leadId} in schema ${tenantSchema}`);
      
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
  }, [toast, fetchLeads, tenantSchema]);

  useEffect(() => {
    if (tenantSchema) {
      fetchLeads();
    }
  }, [fetchLeads, tenantSchema]);

  return {
    leads,
    isLoading,
    error,
    fetchLeads,
    createLead,
    updateLead
  };
}
