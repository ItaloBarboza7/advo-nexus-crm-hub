
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

  // Enhanced intelligent caching system
  const getCachedData = useCallback(() => {
    if (!cacheRef.current) return null;
    
    const age = Date.now() - cacheRef.current.timestamp;
    const maxAge = 15000; // Reduced to 15 seconds for better responsiveness
    
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

  // Aggressive cache invalidation
  const invalidateCache = useCallback(() => {
    console.log('💥 useEnhancedLeadsData - Invalidating cache aggressively');
    cacheRef.current = null;
    versionRef.current += 1;
    addDebugLog('cache_invalidated', { version: versionRef.current }, true);
  }, [addDebugLog]);

  // Post-creation verification with retry logic
  const verifyLeadExists = useCallback(async (leadName: string, retries = 5): Promise<boolean> => {
    if (!tenantSchema) return false;
    
    console.log(`🔍 useEnhancedLeadsData - Verificando existência do lead "${leadName}" (tentativa ${6 - retries})`);
    
    try {
      const sql = `SELECT COUNT(*) as count FROM ${tenantSchema}.leads WHERE name = '${leadName.replace(/'/g, "''")}'`;
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error('❌ useEnhancedLeadsData - Erro na verificação:', error);
        return false;
      }
      
      const count = Array.isArray(data) && data.length > 0 ? data[0].count : 0;
      const exists = count > 0;
      
      console.log(`${exists ? '✅' : '❌'} useEnhancedLeadsData - Lead "${leadName}" ${exists ? 'encontrado' : 'não encontrado'} (count: ${count})`);
      
      if (!exists && retries > 0) {
        console.log(`⏳ useEnhancedLeadsData - Lead não encontrado, aguardando 1s antes de tentar novamente (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return verifyLeadExists(leadName, retries - 1);
      }
      
      return exists;
    } catch (error) {
      console.error('❌ useEnhancedLeadsData - Erro inesperado na verificação:', error);
      return false;
    }
  }, [tenantSchema]);

  // Enhanced fetch with better error handling and caching
  const fetchLeads = useCallback(async (options: {
    forceRefresh?: boolean;
    skipCache?: boolean;
    source?: string;
    verifyLead?: string;
  } = {}) => {
    const { forceRefresh = false, skipCache = false, source = 'manual', verifyLead } = options;
    
    console.log(`🔄 useEnhancedLeadsData - fetchLeads called with options:`, options);
    
    // Check cache first unless skipping or forcing
    if (!skipCache && !forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData) {
        console.log('📦 useEnhancedLeadsData - Using cached data, skipping fetch');
        setLeads(cachedData);
        setIsLoading(false);
        return cachedData;
      }
    }

    // Debounce protection with shorter interval for new lead creation
    const now = Date.now();
    const debounceInterval = source === 'new_lead_created' ? 100 : 500;
    if (!forceRefresh && (now - lastFetchTime.current) < debounceInterval) {
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
      console.log(`🚀 useEnhancedLeadsData - Starting fetch for source: ${source}`);
      
      // Add more aggressive cache buster for new lead creation
      const cacheBuster = source === 'new_lead_created' 
        ? `-- NEW_LEAD_CB:${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
        : `-- CB:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sql = `SELECT * FROM ${tenantSchema}.leads ORDER BY created_at DESC ${cacheBuster}`;
      
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        endOperation(`fetch_leads_${source}`, { error, sql }, false);
        console.error('❌ useEnhancedLeadsData - Erro ao buscar leads:', error);
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

      console.log(`📊 useEnhancedLeadsData - Fetched ${transformedLeads.length} leads for source: ${source}`);
      
      // Post-creation verification
      if (verifyLead && source === 'new_lead_created') {
        console.log(`🔍 useEnhancedLeadsData - Verificando se o lead "${verifyLead}" está presente nos dados`);
        const leadExists = transformedLeads.some(lead => lead.name === verifyLead);
        console.log(`${leadExists ? '✅' : '❌'} useEnhancedLeadsData - Lead "${verifyLead}" ${leadExists ? 'encontrado' : 'não encontrado'} nos dados`);
        
        if (!leadExists) {
          console.log('⚠️ useEnhancedLeadsData - Lead não encontrado, tentando verificação adicional');
          const verified = await verifyLeadExists(verifyLead);
          if (verified) {
            console.log('🔄 useEnhancedLeadsData - Lead existe no banco, forçando nova busca');
            // Recursive call with force refresh
            return fetchLeads({ forceRefresh: true, source: 'verification_retry', skipCache: true });
          }
        }
      }

      endOperation(`fetch_leads_${source}`, { 
        count: transformedLeads.length, 
        schema: tenantSchema,
        forceRefresh,
        verifyLead: verifyLead || 'none'
      }, true);
      
      if (mountedRef.current) {
        setLeads(transformedLeads);
        setCachedData(transformedLeads);
      }
      
      return transformedLeads;
    } catch (error: any) {
      endOperation(`fetch_leads_${source}`, { error: error.message }, false);
      console.error('❌ useEnhancedLeadsData - Erro inesperado ao buscar leads:', error);
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
  }, [tenantSchema, toast, leads, getCachedData, setCachedData, addDebugLog, startOperation, endOperation, verifyLeadExists]);

  // Enhanced intelligent polling system
  const startPolling = useCallback(() => {
    if (pollingInterval.current) return;
    
    addDebugLog('polling_started', { interval: 3000 }, true);
    console.log('🔔 useEnhancedLeadsData - Starting enhanced polling every 3 seconds');
    
    pollingInterval.current = setInterval(() => {
      console.log('📡 useEnhancedLeadsData - Polling tick, fetching latest data');
      fetchLeads({ source: 'polling', skipCache: true, forceRefresh: true });
    }, 3000); // More frequent polling
  }, [fetchLeads, addDebugLog]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      console.log('🔔 useEnhancedLeadsData - Polling stopped');
      addDebugLog('polling_stopped', {}, true);
    }
  }, [addDebugLog]);

  // Enhanced real-time subscription with better fallback
  const setupRealtimeSubscription = useCallback(() => {
    if (!tenantSchema || realtimeChannel.current) return;

    startOperation('setup_realtime');
    console.log(`🔗 useEnhancedLeadsData - Setting up realtime subscription for schema: ${tenantSchema}`);
    
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
            console.log('⚡ useEnhancedLeadsData - Realtime change detected:', payload);
            addDebugLog('realtime_change', { 
              event: payload.eventType,
              table: payload.table,
              schema: payload.schema 
            }, true);
            
            // Invalidate cache immediately on any change
            invalidateCache();
            
            // Fetch fresh data with aggressive refresh
            fetchLeads({ 
              forceRefresh: true, 
              skipCache: true, 
              source: 'realtime',
              verifyLead: payload.eventType === 'INSERT' ? payload.new?.name : undefined
            });
          }
        )
        .subscribe((status) => {
          console.log(`🔗 useEnhancedLeadsData - Realtime subscription status: ${status}`);
          endOperation('setup_realtime', { status, schema: tenantSchema }, status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            addDebugLog('realtime_subscribed', { schema: tenantSchema }, true);
            console.log('✅ useEnhancedLeadsData - Realtime subscription successful');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            addDebugLog('realtime_failed', { status, schema: tenantSchema }, false);
            console.log('❌ useEnhancedLeadsData - Realtime subscription failed, starting polling fallback');
            // Start polling as fallback
            startPolling();
          }
        });
    } catch (error) {
      endOperation('setup_realtime', { error }, false);
      addDebugLog('realtime_setup_error', { error }, false);
      console.error('❌ useEnhancedLeadsData - Realtime setup error:', error);
      // Start polling as fallback
      startPolling();
    }
  }, [tenantSchema, fetchLeads, addDebugLog, startOperation, endOperation, startPolling, invalidateCache]);

  // Enhanced refresh function with post-creation support
  const refreshData = useCallback((options: {
    forceRefresh?: boolean;
    source?: string;
    verifyLead?: string;
  } = {}) => {
    const { forceRefresh = false, source = 'manual_refresh', verifyLead } = options;
    
    console.log(`🔄 useEnhancedLeadsData - refreshData called with options:`, options);
    addDebugLog('refresh_requested', { forceRefresh, source, verifyLead }, true);
    
    // Invalidate cache on force refresh or new lead creation
    if (forceRefresh || source === 'new_lead_created') {
      invalidateCache();
    }
    
    return fetchLeads({ forceRefresh, skipCache: forceRefresh, source, verifyLead });
  }, [fetchLeads, addDebugLog, invalidateCache]);

  // Enhanced update function with optimistic updates
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    try {
      startOperation('update_lead');
      addDebugLog('update_lead_start', { leadId, updates }, true);
      console.log(`🔄 useEnhancedLeadsData - Updating lead ${leadId}:`, updates);
      
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
      invalidateCache();

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
  }, [tenantSchema, ensureTenantSchema, toast, refreshData, addDebugLog, startOperation, endOperation, invalidateCache]);

  // Initial setup and cleanup
  useEffect(() => {
    if (tenantSchema) {
      console.log(`🚀 useEnhancedLeadsData - Initial setup for tenant schema: ${tenantSchema}`);
      fetchLeads({ source: 'initial_load' });
      setupRealtimeSubscription();
    }
  }, [tenantSchema, fetchLeads, setupRealtimeSubscription]);

  useEffect(() => {
    return () => {
      console.log('🧹 useEnhancedLeadsData - Cleanup on unmount');
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
    hasRealtimeConnection: !!realtimeChannel.current,
    // Enhanced methods
    invalidateCache,
    verifyLeadExists
  }), [leads, lossReasons, isLoading, fetchLeads, refreshData, updateLead, invalidateCache, verifyLeadExists]);
}
