
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/types/lead';
import { useTenantSchema } from '@/hooks/useTenantSchema';

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSecureTenantData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

  const fetchData = useCallback(async () => {
    if (!tenantSchema) {
      console.log("🚫 useSecureTenantData - No tenant schema available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("🔄 useSecureTenantData - Fetching tenant data from schema:", tenantSchema);
      
      // Fetch leads and columns in parallel
      const [leadsResult, columnsResult] = await Promise.all([
        supabase
          .from(`${tenantSchema}.leads`)
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from(`${tenantSchema}.kanban_columns`)
          .select('*')
          .order('order_position', { ascending: true })
      ]);

      if (leadsResult.error) {
        console.error('❌ Error fetching leads:', leadsResult.error);
        throw new Error(leadsResult.error.message);
      }

      if (columnsResult.error) {
        console.error('❌ Error fetching columns:', columnsResult.error);
        throw new Error(columnsResult.error.message);
      }

      // Transform leads data
      const transformedLeads: Lead[] = (leadsResult.data || []).map((lead: any) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
      }));

      console.log(`✅ useSecureTenantData - ${transformedLeads.length} leads and ${(columnsResult.data || []).length} columns loaded successfully`);
      
      setLeads(transformedLeads);
      setColumns(columnsResult.data || []);

    } catch (error: any) {
      console.error('❌ Error fetching tenant data:', error);
      setError(error.message || 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
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
      console.log("🔄 useSecureTenantData - Creating lead in schema:", tenantSchema);
      
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

      console.log('✅ useSecureTenantData - Lead created successfully:', data.id);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      
      // Refresh data
      await fetchData();
      
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
  }, [toast, fetchData, tenantSchema]);

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
      console.log(`🔄 useSecureTenantData - Updating lead ${leadId} in schema ${tenantSchema}`);
      
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

      console.log('✅ useSecureTenantData - Lead updated successfully');
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });
      
      // Refresh data
      await fetchData();
      
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
  }, [toast, fetchData, tenantSchema]);

  useEffect(() => {
    if (tenantSchema) {
      fetchData();
    }
  }, [fetchData, tenantSchema]);

  return {
    leads,
    columns,
    isLoading,
    error,
    fetchData,
    createLead,
    updateLead
  };
}
