
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedSecurityMonitoring } from '@/hooks/useEnhancedSecurityMonitoring';

// Hook to replace common exec_sql patterns with direct Supabase client calls
export function useReducedExecSqlOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { validateTenantOperation, reportSecurityEvent } = useEnhancedSecurityMonitoring();

  // Replace exec_sql lead queries with direct client calls
  const getLeadsWithFilters = useCallback(async (filters: {
    status?: string;
    source?: string;
    dateRange?: { start: string; end: string };
  }) => {
    try {
      setIsLoading(true);

      if (!await validateTenantOperation('get_leads_with_filters', filters)) {
        return null;
      }

      let query = supabase.from('leads').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        await reportSecurityEvent('SECURE_QUERY_ERROR', 'medium', { error, filters });
        throw error;
      }

      await reportSecurityEvent('SECURE_QUERY_SUCCESS', 'low', { 
        operation: 'get_leads_with_filters',
        resultCount: data?.length || 0 
      });

      return data;
    } catch (error) {
      console.error('❌ Error in getLeadsWithFilters:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar os leads",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [validateTenantOperation, reportSecurityEvent, toast]);

  // Replace exec_sql status update with direct client call
  const updateLeadStatusSecure = useCallback(async (
    leadId: string, 
    newStatus: string, 
    lossReason?: string
  ) => {
    try {
      setIsLoading(true);

      if (!await validateTenantOperation('update_lead_status', { leadId, newStatus })) {
        return false;
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Handle loss reason logic
      if (newStatus === "Perdido" && lossReason) {
        updateData.loss_reason = lossReason;
      } else if (newStatus !== "Perdido") {
        updateData.loss_reason = null;
      }

      // Handle contract closure
      if (newStatus === "Contrato Fechado") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.closed_by_user_id = user.id;
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        await reportSecurityEvent('SECURE_UPDATE_ERROR', 'medium', { error, leadId, newStatus });
        throw error;
      }

      await reportSecurityEvent('SECURE_UPDATE_SUCCESS', 'low', { 
        operation: 'update_lead_status',
        leadId,
        newStatus 
      });

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso"
      });

      return true;
    } catch (error) {
      console.error('❌ Error in updateLeadStatusSecure:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do lead",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateTenantOperation, reportSecurityEvent, toast]);

  // Replace exec_sql delete with direct client call
  const deleteLeadSecure = useCallback(async (leadId: string) => {
    try {
      setIsLoading(true);

      if (!await validateTenantOperation('delete_lead', { leadId })) {
        return false;
      }

      // First check if lead exists
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, name, status')
        .eq('id', leadId)
        .single();

      if (!existingLead) {
        toast({
          title: "Erro",
          description: "Lead não encontrado",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        await reportSecurityEvent('SECURE_DELETE_ERROR', 'medium', { error, leadId });
        throw error;
      }

      await reportSecurityEvent('SECURE_DELETE_SUCCESS', 'low', { 
        operation: 'delete_lead',
        leadId,
        leadName: existingLead.name 
      });

      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso"
      });

      return true;
    } catch (error) {
      console.error('❌ Error in deleteLeadSecure:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lead",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateTenantOperation, reportSecurityEvent, toast]);

  return {
    getLeadsWithFilters,
    updateLeadStatusSecure,
    deleteLeadSecure,
    isLoading
  };
}
