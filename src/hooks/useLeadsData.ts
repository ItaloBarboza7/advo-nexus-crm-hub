
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";

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

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { lossReasons } = useLossReasonsGlobal();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);

  // Debounce mechanism to prevent rapid successive calls
  const FETCH_DEBOUNCE_MS = 1000;

  const fetchLeads = useCallback(async () => {
    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("🚫 useLeadsData - Fetch skipped (debounce or already fetching)");
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoading(true);
      console.log("📊 useLeadsData - Fetching leads using secure function...");
      
      const { data, error } = await supabase.rpc('get_tenant_leads');

      if (error) {
        console.error('❌ Error fetching leads:', error);
        if (mountedRef.current) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os leads.",
            variant: "destructive"
          });
        }
        return;
      }

      const transformedLeads: Lead[] = (data as TenantLead[] || []).map((lead: TenantLead) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
      }));

      console.log(`✅ useLeadsData - ${transformedLeads.length} leads loaded securely`);
      if (mountedRef.current) {
        setLeads(prev => {
          // Only update if data has actually changed
          if (JSON.stringify(prev) !== JSON.stringify(transformedLeads)) {
            return transformedLeads;
          }
          return prev;
        });
      }
    } catch (error: any) {
      console.error('❌ Unexpected error fetching leads:', error);
      if (mountedRef.current) {
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado ao carregar os leads.",
          variant: "destructive"
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [toast]);

  // Memoize refresh function to prevent recreation
  const refreshData = useMemo(() => {
    return () => {
      console.log(`🔄 useLeadsData - Refreshing lead data...`);
      fetchLeads();
    };
  }, [fetchLeads]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    try {
      console.log(`📝 useLeadsData - Updating lead ${leadId}:`, updates);
      
      // Get current lead data first
      const currentLead = leads.find(lead => lead.id === leadId);
      if (!currentLead) {
        console.error('❌ Lead not found in current data');
        return false;
      }

      // Merge updates with current data
      const updatedLeadData = { ...currentLead, ...updates };

      const { data: success, error } = await supabase.rpc('update_tenant_lead', {
        p_lead_id: leadId,
        p_name: updatedLeadData.name,
        p_email: updatedLeadData.email,
        p_phone: updatedLeadData.phone,
        p_state: updatedLeadData.state,
        p_source: updatedLeadData.source,
        p_status: updatedLeadData.status,
        p_action_group: updatedLeadData.action_group,
        p_action_type: updatedLeadData.action_type,
        p_value: updatedLeadData.value,
        p_description: updatedLeadData.description,
        p_loss_reason: updatedLeadData.loss_reason
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

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...updates } : lead
      ));

      console.log(`✅ useLeadsData - Lead ${leadId} updated successfully`);
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Unexpected error updating lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    }
  }, [leads, toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Memoize the return object to prevent recreation
  return useMemo(() => ({
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshData,
    updateLead
  }), [leads, lossReasons, isLoading, fetchLeads, refreshData, updateLead]);
}
