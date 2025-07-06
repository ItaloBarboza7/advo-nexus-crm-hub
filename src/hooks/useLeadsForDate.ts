
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { BrazilTimezone } from '@/lib/timezone';
import { DateRange } from 'react-day-picker';
import { Lead } from '@/types/lead';

// Cache de dados melhorado
let dataCache: Map<string, {
  data: Lead[];
  timestamp: number;
  isValid: boolean;
}> = new Map();

const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useLeadsForDate() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { tenantSchema, isResolved: schemaResolved, isLoading: schemaLoading, refreshSchema } = useTenantSchema();
  
  // Refs para controle de estado e prevenção de condições de corrida
  const isMountedRef = useRef(true);
  const currentRequestRef = useRef<string | null>(null);
  const lastSuccessfulDataRef = useRef<Lead[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  // Buscar usuário atual apenas uma vez com retry melhorado
  useEffect(() => {
    let isMounted = true;
    
    // Prevenir múltiplas inicializações
    if (initializationRef.current) {
      return;
    }
    
    initializationRef.current = (async () => {
      let retryCount = 0;
      
      while (retryCount < MAX_RETRIES && isMounted) {
        try {
          console.log(`🔍 useLeadsForDate - Tentativa ${retryCount + 1} de obter usuário atual...`);
          
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
          
          console.log("✅ useLeadsForDate - Usuário atual carregado:", userData);
          
          if (isMounted) {
            setCurrentUser(userData);
          }
          break;
          
        } catch (error) {
          console.error(`❌ useLeadsForDate - Erro na tentativa ${retryCount + 1}:`, error);
          retryCount++;
          
          if (retryCount < MAX_RETRIES && isMounted) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          } else if (isMounted) {
            setError("Erro ao carregar dados do usuário");
          }
        }
      }
    })();

    return () => {
      isMounted = false;
      initializationRef.current = null;
    };
  }, []);

  // Limpar referências quando componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Função para gerar chave de cache
  const getCacheKey = useCallback((dateQuery: string, tenantSchema: string) => {
    return `${tenantSchema}_${dateQuery}`;
  }, []);

  // Função para verificar validade do cache
  const isCacheValid = useCallback((cacheKey: string) => {
    const cached = dataCache.get(cacheKey);
    if (!cached || !cached.isValid) return false;
    
    const now = Date.now();
    const isValid = (now - cached.timestamp) < CACHE_DURATION;
    
    console.log(`🔍 useLeadsForDate - Cache check para "${cacheKey}":`, {
      exists: !!cached,
      isValid: cached.isValid,
      age: now - cached.timestamp,
      maxAge: CACHE_DURATION,
      result: isValid
    });
    
    return isValid;
  }, []);

  const canFetchData = useCallback(() => {
    const canFetch = schemaResolved && tenantSchema && currentUser && !schemaLoading;
    
    console.log("🔍 useLeadsForDate - Verificação de dependências (melhorada):", {
      schemaResolved,
      hasTenantSchema: !!tenantSchema,
      hasCurrentUser: !!currentUser,
      schemaLoading,
      canFetch,
      tenantSchemaValue: tenantSchema
    });
    
    return canFetch;
  }, [schemaResolved, tenantSchema, currentUser, schemaLoading]);

  // Função interna para executar query com retry e cache
  const executeLeadsQuery = async (sql: string, cacheKey: string, requestId: string): Promise<Lead[]> => {
    // Verificar cache primeiro
    if (isCacheValid(cacheKey)) {
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
        dataCache.set(cacheKey, {
          data: transformedLeads,
          timestamp: Date.now(),
          isValid: true
        });

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
    // Limpar timeout anterior se existir
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce de 300ms
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!selectedDate) {
        console.log("🚫 useLeadsForDate - Data não fornecida");
        if (lastSuccessfulDataRef.current.length === 0) {
          setLeads([]);
        }
        return;
      }

      if (!canFetchData()) {
        console.log("🚫 useLeadsForDate - Dependências não prontas, tentando refresh do schema...");
        
        try {
          await refreshSchema();
          // Tentar novamente após o refresh
          if (!canFetchData()) {
            if (lastSuccessfulDataRef.current.length === 0) {
              setLeads([]);
            }
            return;
          }
        } catch (error) {
          console.error("❌ useLeadsForDate - Falha no refresh do schema:", error);
          if (lastSuccessfulDataRef.current.length === 0) {
            setLeads([]);
          }
          return;
        }
      }

      const requestId = `date_${selectedDate.getTime()}_${Date.now()}`;
      currentRequestRef.current = requestId;

      try {
        if (!isMountedRef.current) return;
        
        setIsLoading(true);
        setError(null);
        
        console.log("📅 useLeadsForDate - Buscando leads cadastrados em:", BrazilTimezone.formatDateForDisplay(selectedDate));

        const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
        const cacheKey = getCacheKey(`date_${dateString}`, tenantSchema!);
        
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
          lastSuccessfulDataRef.current = transformedLeads;
        }
        
      } catch (error: any) {
        console.error('❌ useLeadsForDate - Erro ao buscar leads por data:', error);
        if (isMountedRef.current && currentRequestRef.current === requestId) {
          setError(error.message || "Erro ao carregar leads");
          // Manter dados anteriores em caso de erro
          if (lastSuccessfulDataRef.current.length > 0) {
            setLeads(lastSuccessfulDataRef.current);
          } else {
            setLeads([]);
          }
        }
      } finally {
        if (isMountedRef.current && currentRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, 300);
  }, [canFetchData, tenantSchema, currentUser, schemaResolved, schemaLoading, getCacheKey, refreshSchema]);

  const fetchLeadsForDateRange = useCallback(async (dateRange: DateRange) => {
    // Limpar timeout anterior se existir
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce de 300ms
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!dateRange.from) {
        console.log("🚫 useLeadsForDate - Período não fornecido");
        if (lastSuccessfulDataRef.current.length === 0) {
          setLeads([]);
        }
        return;
      }

      if (!canFetchData()) {
        console.log("🚫 useLeadsForDate - Dependências não prontas para período, tentando refresh...");
        
        try {
          await refreshSchema();
          if (!canFetchData()) {
            if (lastSuccessfulDataRef.current.length === 0) {
              setLeads([]);
            }
            return;
          }
        } catch (error) {
          console.error("❌ useLeadsForDate - Falha no refresh para período:", error);
          if (lastSuccessfulDataRef.current.length === 0) {
            setLeads([]);
          }
          return;
        }
      }

      const requestId = `range_${dateRange.from.getTime()}_${dateRange.to?.getTime() || 0}_${Date.now()}`;
      currentRequestRef.current = requestId;

      try {
        if (!isMountedRef.current) return;
        
        setIsLoading(true);
        setError(null);
        
        const fromDate = BrazilTimezone.formatDateForQuery(dateRange.from);
        const toDate = dateRange.to ? BrazilTimezone.formatDateForQuery(dateRange.to) : fromDate;
        const cacheKey = getCacheKey(`range_${fromDate}_${toDate}`, tenantSchema!);
        
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
          lastSuccessfulDataRef.current = transformedLeads;
        }
        
      } catch (error: any) {
        console.error('❌ useLeadsForDate - Erro ao buscar leads por período:', error);
        if (isMountedRef.current && currentRequestRef.current === requestId) {
          setError(error.message || "Erro ao carregar leads");
          // Manter dados anteriores em caso de erro
          if (lastSuccessfulDataRef.current.length > 0) {
            setLeads(lastSuccessfulDataRef.current);
          } else {
            setLeads([]);
          }
        }
      } finally {
        if (isMountedRef.current && currentRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, 300);
  }, [canFetchData, tenantSchema, currentUser, schemaResolved, schemaLoading, getCacheKey, refreshSchema]);

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
