
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { BrazilTimezone } from '@/lib/timezone';
import { DateRange } from 'react-day-picker';
import { Lead } from '@/types/lead';

// Cache melhorado com controle de validade
let dataCache: Map<string, {
  data: Lead[];
  timestamp: number;
  isValid: boolean;
  userId: string;
}> = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useLeadsForDate() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { tenantSchema, isResolved: schemaResolved, refreshSchema } = useTenantSchema();
  
  // Refs para controle de estado
  const isMountedRef = useRef(true);
  const currentRequestRef = useRef<string | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);
  const userInitializedRef = useRef(false);

  // Limpar referências quando componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Inicializar usuário uma única vez
  useEffect(() => {
    if (userInitializedRef.current) return;
    
    let isMounted = true;
    
    const initializeUser = async () => {
      try {
        console.log('🔍 useLeadsForDate - Inicializando usuário...');
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error(userError?.message || 'Usuário não encontrado');
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const userData = {
          id: user.id,
          name: profile?.name || user.email || 'Usuário'
        };
        
        console.log("✅ useLeadsForDate - Usuário inicializado:", userData);
        
        if (isMounted) {
          setCurrentUser(userData);
          userInitializedRef.current = true;
        }
        
      } catch (error) {
        console.error('❌ useLeadsForDate - Erro ao inicializar usuário:', error);
        if (isMounted) {
          setError("Erro ao carregar dados do usuário");
        }
      }
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Função para gerar chave de cache
  const getCacheKey = useCallback((dateQuery: string, tenantSchema: string, userId: string) => {
    return `${tenantSchema}_${userId}_${dateQuery}`;
  }, []);

  // Função para verificar validade do cache
  const isCacheValid = useCallback((cacheKey: string, userId: string) => {
    const cached = dataCache.get(cacheKey);
    if (!cached || !cached.isValid || cached.userId !== userId) {
      return false;
    }
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < CACHE_DURATION;
    
    console.log(`🔍 useLeadsForDate - Cache check para "${cacheKey}":`, {
      exists: !!cached,
      userMatch: cached.userId === userId,
      isValid: cached.isValid,
      age: now - cached.timestamp,
      maxAge: CACHE_DURATION,
      result: isValid
    });
    
    return isValid;
  }, []);

  // Verificação melhorada de dependências
  const canFetchData = useCallback(() => {
    const canFetch = schemaResolved && tenantSchema && currentUser && userInitializedRef.current;
    
    console.log("🔍 useLeadsForDate - Verificação de dependências:", {
      schemaResolved,
      hasTenantSchema: !!tenantSchema,
      hasCurrentUser: !!currentUser,
      userInitialized: userInitializedRef.current,
      canFetch,
      tenantSchemaValue: tenantSchema
    });
    
    return canFetch;
  }, [schemaResolved, tenantSchema, currentUser]);

  // Função para executar query com retry
  const executeLeadsQuery = async (sql: string, cacheKey: string, requestId: string): Promise<Lead[]> => {
    // Verificar cache primeiro
    if (currentUser && isCacheValid(cacheKey, currentUser.id)) {
      const cached = dataCache.get(cacheKey);
      console.log(`✅ useLeadsForDate - Usando dados do cache para "${cacheKey}"`);
      return cached!.data;
    }

    // Executar query com retry
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📊 useLeadsForDate - Executando query (tentativa ${attempt}/${MAX_RETRIES})`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (!isMountedRef.current || currentRequestRef.current !== requestId) {
          throw new Error('Request cancelled');
        }

        if (error) {
          throw new Error(error.message || "Erro ao executar consulta");
        }

        const leadsData = Array.isArray(data) ? data : [];
        
        const transformedLeads: Lead[] = leadsData
          .filter((item: any) => item && typeof item === 'object')
          .map((lead: any) => ({
            id: lead.id || 'unknown',
            name: lead.name || 'Nome não informado',
            phone: lead.phone || '',
            email: lead.email || null,
            source: lead.source || null,
            status: lead.status || 'Novo',
            created_at: lead.created_at || new Date().toISOString(),
            updated_at: lead.updated_at || new Date().toISOString(),
            value: lead.value ? Number(lead.value) : null,
            user_id: lead.user_id || currentUser!.id,
            action_type: lead.action_type || null,
            action_group: lead.action_group || null,
            description: lead.description || null,
            state: lead.state || null,
            loss_reason: lead.loss_reason || null,
            closed_by_user_id: lead.closed_by_user_id || null
          } as Lead));

        // Armazenar no cache
        if (currentUser) {
          dataCache.set(cacheKey, {
            data: transformedLeads,
            timestamp: Date.now(),
            isValid: true,
            userId: currentUser.id
          });
        }

        console.log(`✅ useLeadsForDate - ${transformedLeads.length} leads processados e armazenados no cache`);
        return transformedLeads;

      } catch (error: any) {
        lastError = error;
        console.error(`❌ useLeadsForDate - Erro na tentativa ${attempt}:`, error);
        
        if (attempt < MAX_RETRIES && error.message !== 'Request cancelled') {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    throw lastError || new Error('Falha após múltiplas tentativas');
  };

  const fetchLeadsForDate = useCallback(async (selectedDate: Date) => {
    if (!selectedDate) {
      console.log("🚫 useLeadsForDate - Data não fornecida");
      setLeads([]);
      return;
    }

    if (!canFetchData()) {
      console.log("🚫 useLeadsForDate - Dependências não prontas");
      return;
    }

    const requestId = `date_${selectedDate.getTime()}_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      console.log("📅 useLeadsForDate - Buscando leads para data:", BrazilTimezone.formatDateForDisplay(selectedDate));

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      const cacheKey = getCacheKey(`date_${dateString}`, tenantSchema!, currentUser!.id);
      
      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY created_at DESC
      `;

      const transformedLeads = await executeLeadsQuery(sql, cacheKey, requestId);

      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setLeads(transformedLeads);
        console.log(`✅ useLeadsForDate - ${transformedLeads.length} leads carregados para a data`);
      }
      
    } catch (error: any) {
      console.error('❌ useLeadsForDate - Erro ao buscar leads por data:', error);
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setError(error.message || "Erro ao carregar leads");
        setLeads([]);
      }
    } finally {
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [canFetchData, tenantSchema, currentUser, getCacheKey]);

  const fetchLeadsForDateRange = useCallback(async (dateRange: DateRange) => {
    if (!dateRange.from) {
      console.log("🚫 useLeadsForDate - Período não fornecido");
      setLeads([]);
      return;
    }

    if (!canFetchData()) {
      console.log("🚫 useLeadsForDate - Dependências não prontas para período");
      return;
    }

    const requestId = `range_${dateRange.from.getTime()}_${dateRange.to?.getTime() || 0}_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      const fromDate = BrazilTimezone.formatDateForQuery(dateRange.from);
      const toDate = dateRange.to ? BrazilTimezone.formatDateForQuery(dateRange.to) : fromDate;
      const cacheKey = getCacheKey(`range_${fromDate}_${toDate}`, tenantSchema!, currentUser!.id);
      
      console.log("📅 useLeadsForDate - Buscando leads para período:", { fromDate, toDate });

      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY created_at DESC
      `;

      const transformedLeads = await executeLeadsQuery(sql, cacheKey, requestId);

      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setLeads(transformedLeads);
        console.log(`✅ useLeadsForDate - ${transformedLeads.length} leads carregados para o período`);
      }
      
    } catch (error: any) {
      console.error('❌ useLeadsForDate - Erro ao buscar leads por período:', error);
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setError(error.message || "Erro ao carregar leads");
        setLeads([]);
      }
    } finally {
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [canFetchData, tenantSchema, currentUser, getCacheKey]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    console.log('🗑️ useLeadsForDate - Limpando cache de dados...');
    dataCache.clear();
  }, []);

  return {
    leads,
    isLoading,
    error,
    currentUser,
    fetchLeadsForDate,
    fetchLeadsForDateRange,
    schemaResolved,
    canFetchData: canFetchData(),
    clearCache
  };
}
