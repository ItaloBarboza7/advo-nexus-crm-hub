
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { useLeadsDebugger } from "@/hooks/useLeadsDebugger";

interface CacheEntry {
  data: Lead[];
  timestamp: number;
  version: number;
}

export function useEnhancedLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { lossReasons } = useLossReasonsGlobal();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const { addDebugLog, startOperation, endOperation } = useLeadsDebugger();
  
  const mountedRef = useRef(true);
  const lastFetchTime = useRef(0);
  const realtimeChannel = useRef<any>(null);
  const cacheRef = useRef<CacheEntry | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const versionRef = useRef(0);

  // Intelligent caching system
  const getCachedData = useCallback(() => {
    if (!cacheRef.current) return null;
    
    const age = Date.now() - cacheRef.current.timestamp;
    const maxAge = 30000; // 30 seconds
    
    if (age > maxAge) {
      addDebugLog('cache_expired', { age, maxAge }, false);
      return null;
    }
    
    addDebugLog('cache_hit', { age, dataLength: cacheRef.current.data.length }, true);
    return cacheRef.current.data;
  }, [addDebugLog]);

  const setCachedData = useCallback((data: Lead[]) => {
    versionRef.current += 1;
    cacheRef.current = {
      data: [...data],
      timestamp: Date.now(),
      version: versionRef.current
    };
    addDebugLog('cache_updated', { dataLength: data.length, version: versionRef.current }, true);
  }, [addDebugLog]);

  // Enhanced fetch with better error handling and caching
  const fetchLeads = useCallback(async (options: {
    forceRefresh?: boolean;
    skipCache?: boolean;
    source?: string;
  } = {}) => {
    const { forceRefresh = false, skipCache = false, source = 'manual' } = options;
    
    // Check cache first unless skipping or forcing
    if (!skipCache && !forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData) {
        setLeads(cachedData);
        setIsLoading(false);
        return cachedData;
      }
    }

    // Debounce protection
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime.current) < 500) {
      addDebugLog('fetch_debounced', { timeSinceLastFetch: now - lastFetchTime.current, source }, false);
      return leads;
    }
    
    if (!tenantSchema) {
      addDebugLog('fetch_no_schema', { tenantSchema }, false);
      return [];
    }
    
    try {
      lastFetchTime.current = now;
      setIsLoading(true);
      
      startOperation(`fetch_leads_${source}`);
      
      // Add cache buster to prevent RPC caching
      const cacheBuster = `-- CB:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sql = `SELECT * FROM ${tenantSchema}.leads ORDER BY created_at DESC ${cacheBuster}`;
      
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        endOperation(`fetch_leads_${source}`, { error, sql }, false);
        console.error('❌ Erro ao buscar leads:', error);
        if (mountedRef.current) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os leads.",
            variant: "destructive"
          });
        }
        return leads; // Return current state on error
      }

      const leadsData = Array.isArray(data) ? data : [];
      const transformedLeads: Lead[] = leadsData.map((lead: any) => ({
        ...lead,
        company: undefined,
        interest: undefined,
        lastContact: undefined,
        avatar: undefined,
        closed_by_user_id: lead.closed_by_user_id || null
      }));

      endOperation(`fetch_leads_${source}`, { 
        count: transformedLeads.length, 
        schema: tenantSchema,
        forceRefresh 
      }, true);
      
      if (mountedRef.current) {
        setLeads(transformedLeads);
        setCachedData(transformedLeads);
      }
      
      return transformedLeads;
    } catch (error: any) {
      endOperation(`fetch_leads_${source}`, { error: error.message }, false);
      console.error('❌ Erro inesperado ao buscar leads:', error);
      if (mountedRef.current) {
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado ao carregar os leads.",
          variant: "destructive"
        });
      }
      return leads; // Return current state on error
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenantSchema, toast, leads, getCachedData, setCachedData, addDebugLog, startOperation, endOperation]);

  // Intelligent polling system as fallback
  const startPolling = useCallback(() => {
    if (pollingInterval.current) return;
    
    addDebugLog('polling_started', { interval: 5000 }, true);
    
    pollingInterval.current = setInterval(() => {
      fetchLeads({ source: 'polling', skipCache: true });
    }, 5000); // Poll every 5 seconds
  }, [fetchLeads, addDebugLog]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      addDebugLog('polling_stopped', {}, true);
    }
  }, [addDebugLog]);

  // Enhanced real-time subscription with fallback
  const setupRealtimeSubscription = useCallback(() => {
    if (!tenantSchema || realtimeChannel.current) return;

    startOperation('setup_realtime');
    
    try {
      realtimeChannel.current = supabase
        .channel(`enhanced_leads_${tenantSchema}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: tenantSchema,
            table: 'leads'
          },
          (payload) => {
            addDebugLog('realtime_change', { 
              event: payload.eventType,
              table: payload.table,
              schema: payload.schema 
            }, true);
            
            // Fetch fresh data on any change
            fetchLeads({ forceRefresh: true, skipCache: true, source: 'realtime' });
          }
        )
        .subscribe((status) => {
          endOperation('setup_realtime', { status, schema: tenantSchema }, status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            addDebugLog('realtime_subscribed', { schema: tenantSchema }, true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            addDebugLog('realtime_failed', { status, schema: tenantSchema }, false);
            // Start polling as fallback
            startPolling();
          }
        });
    } catch (error) {
      endOperation('setup_realtime', { error }, false);
      addDebugLog('realtime_setup_error', { error }, false);
      // Start polling as fallback
      startPolling();
    }
  }, [tenantSchema, fetchLeads, addDebugLog, startOperation, endOperation, startPolling]);

  // Enhanced refresh function
  const refreshData = useCallback((options: {
    forceRefresh?: boolean;
    source?: string;
  } = {}) => {
    const { forceRefresh = false, source = 'manual_refresh' } = options;
    
    addDebugLog('refresh_requested', { forceRefresh, source }, true);
    
    // Invalidate cache on force refresh
    if (forceRefresh) {
      cacheRef.current = null;
    }
    
    return fetchLeads({ forceRefresh, skipCache: forceRefresh, source });
  }, [fetchLeads, addDebugLog]);

  // Enhanced update function with optimistic updates
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    try {
      startOperation('update_lead');
      addDebugLog('update_lead_start', { leadId, updates }, true);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        endOperation('update_lead', { error: 'No tenant schema' }, false);
        return false;
      }

      // Optimistic update
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...updates } : lead
      ));

      // Prepare updates for SQL
      const validUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          validUpdates[key] = value;
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        endOperation('update_lead', { message: 'No valid updates' }, true);
        return true;
      }

      const setClause = Object.keys(validUpdates)
        .map(key => {
          const value = validUpdates[key];
          const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;
          return `${key} = '${escapedValue}'`;
        })
        .join(', ');

      const sql = `UPDATE ${schema}.leads SET ${setClause}, updated_at = now() WHERE id = '${leadId}'`;
      
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        // Revert optimistic update on error
        setLeads(prev => prev.map(lead => 
          lead.id === leadId ? { ...lead, ...updates } : lead
        ));
        
        endOperation('update_lead', { error, sql }, false);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // Invalidate cache
      cacheRef.current = null;

      endOperation('update_lead', { leadId, updatedFields: Object.keys(validUpdates) }, true);
      
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });
      
      // Trigger a fresh fetch to ensure consistency
      setTimeout(() => {
        refreshData({ forceRefresh: true, source: 'post_update' });
      }, 100);
      
      return true;
    } catch (error) {
      endOperation('update_lead', { error }, false);
      addDebugLog('update_lead_error', { leadId, error }, false);
      
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    }
  }, [tenantSchema, ensureTenantSchema, toast, refreshData, addDebugLog, startOperation, endOperation]);

  // Initial setup and cleanup
  useEffect(() => {
    if (tenantSchema) {
      fetchLeads({ source: 'initial_load' });
      setupRealtimeSubscription();
    }
  }, [tenantSchema, fetchLeads, setupRealtimeSubscription]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
      stopPolling();
    };
  }, [stopPolling]);

  return useMemo(() => ({
    leads,
    lossReasons,
    isLoading,
    fetchLeads,
    refreshData,
    updateLead,
    // Debug information
    cacheInfo: cacheRef.current,
    isPolling: !!pollingInterval.current,
    hasRealtimeConnection: !!realtimeChannel.current
  }), [leads, lossReasons, isLoading, fetchLeads, refreshData, updateLead]);
}
