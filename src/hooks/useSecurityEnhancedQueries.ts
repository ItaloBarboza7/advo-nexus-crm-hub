
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

// Enhanced queries that reduce exec_sql usage by using direct Supabase client calls where possible
export function useSecurityEnhancedQueries() {
  const [isLoading, setIsLoading] = useState(false);
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const { toast } = useToast();

  // Secure lead fetching without exec_sql
  const fetchLeadsSecure = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use direct table access instead of exec_sql when possible
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching leads securely:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Unexpected error in fetchLeadsSecure:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Secure status history fetching
  const fetchStatusHistorySecure = useCallback(async (leadId: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching status history securely:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Unexpected error in fetchStatusHistorySecure:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Secure lead creation without exec_sql
  const createLeadSecure = useCallback(async (leadData: any) => {
    try {
      setIsLoading(true);

      // Get current user for tenant validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de Segurança",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating lead securely:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('❌ Unexpected error in createLeadSecure:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    fetchLeadsSecure,
    fetchStatusHistorySecure,
    createLeadSecure,
    isLoading
  };
}
