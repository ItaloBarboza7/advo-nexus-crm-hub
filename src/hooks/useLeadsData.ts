
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { lossReasons } = useLossReasonsGlobal();
  const { tenantSchema } = useTenantSchema();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);

  // Debounce mechanism to prevent rapid successive calls
  const FETCH_DEBOUNCE_MS = 1000;

  const fetchLeads = useCallback(async () => {
    if (!tenantSchema) {
      console.log("🚫 useLeadsData - No tenant schema available");
      return;
    }

    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("🚫 useLeadsData - Fetch skipped (debounce or already fetching)");
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoading(true);
      console.log("📊 useLeadsData - Fetching leads from tenant schema:", tenantSchema);
      
      const { data, error } = await supabase
        .from(`${tenantSchema}.leads`)
        .select('*')
        .order('created_at', { ascending: false });

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

      const transformedLeads: Lead[] = (data || []).map((lead: any) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
      }));

      console.log(`✅ useLeadsData - ${transformedLeads.length} leads loaded from tenant schema`);
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
  }, [toast, tenantSchema]);

  // Memoize refresh function to prevent recreation
  const refreshData = useMemo(() => {
    return () => {
      console.log(`🔄 useLeadsData - Refreshing lead data...`);
      fetchLeads();
    };
  }, [fetchLeads]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    if (!tenantSchema) {
      console.error('❌ No tenant schema available for update');
      return false;
    }

    try {
      console.log(`📝 useLeadsData - Updating lead ${leadId} in schema ${tenantSchema}:`, updates);
      
      const { error } = await supabase
        .from(`${tenantSchema}.leads`)
        .update(updates)
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
  }, [tenantSchema, toast]);

  useEffect(() => {
    if (tenantSchema) {
      fetchLeads();
    }
  }, [fetchLeads, tenantSchema]);

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
