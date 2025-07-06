
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache global para o schema do tenant - melhorado com persistência
let schemaCache: { 
  schema: string | null; 
  timestamp: number; 
  userId: string | null;
  isValid: boolean;
} = {
  schema: null,
  timestamp: 0,
  userId: null,
  isValid: false
};

const CACHE_DURATION = 10 * 60 * 1000; // Aumentado para 10 minutos
const MAX_RETRIES = 5; // Aumentado para 5 tentativas
const RETRY_DELAY = 1500; // Aumentado para 1.5 segundos

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(schemaCache.schema);
  const [isLoading, setIsLoading] = useState(!schemaCache.isValid);
  const [isResolved, setIsResolved] = useState(schemaCache.isValid);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const initializationPromiseRef = useRef<Promise<string | null> | null>(null);

  // Limpar referência quando componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getCurrentUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('❌ useTenantSchema - Erro ao obter usuário atual:', error);
      return null;
    }
  };

  const isCacheValid = (userId: string | null) => {
    const now = Date.now();
    const isValid = schemaCache.schema && 
                   schemaCache.userId === userId &&
                   schemaCache.isValid &&
                   (now - schemaCache.timestamp) < CACHE_DURATION;
    
    console.log('🔍 useTenantSchema - Cache validation (melhorada):', {
      hasSchema: !!schemaCache.schema,
      userMatch: schemaCache.userId === userId,
      cacheIsValid: schemaCache.isValid,
      ageMs: now - schemaCache.timestamp,
      maxAgeMs: CACHE_DURATION,
      isValid
    });
    
    return isValid;
  };

  const getTenantSchemaWithRetry = async (userId: string | null, attempt = 1): Promise<string | null> => {
    try {
      console.log(`🏗️ useTenantSchema - Tentativa ${attempt}/${MAX_RETRIES} de obter esquema do tenant...`);
      
      const { data, error } = await supabase.rpc('get_tenant_schema');
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Schema do tenant não encontrado');
      }

      console.log(`✅ useTenantSchema - Esquema obtido na tentativa ${attempt}: ${data}`);
      
      // Atualizar cache com validação melhorada
      schemaCache = {
        schema: data,
        timestamp: Date.now(),
        userId: userId,
        isValid: true
      };
      
      return data;
    } catch (error) {
      console.error(`❌ useTenantSchema - Erro na tentativa ${attempt}:`, error);
      
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 useTenantSchema - Tentando novamente em ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return getTenantSchemaWithRetry(userId, attempt + 1);
      }
      
      // Invalidar cache em caso de erro persistente
      schemaCache.isValid = false;
      throw error;
    }
  };

  // Função de inicialização centralizada com controle de concorrência
  const initializeTenantSchema = async (): Promise<string | null> => {
    // Prevenir múltiplas inicializações simultâneas
    if (initializationPromiseRef.current) {
      console.log('🔒 useTenantSchema - Inicialização já em andamento, aguardando...');
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      try {
        if (!isMountedRef.current) return null;
        
        console.log('🚀 useTenantSchema - Inicializando (versão melhorada)...');
        setIsLoading(true);
        setError(null);
        retryCountRef.current = 0;

        const currentUserId = await getCurrentUserId();
        
        if (!isMountedRef.current) return null;

        // Verificar cache primeiro
        if (isCacheValid(currentUserId)) {
          console.log('✅ useTenantSchema - Usando schema do cache (validado):', schemaCache.schema);
          if (isMountedRef.current) {
            setTenantSchema(schemaCache.schema);
            setIsResolved(true);
            setIsLoading(false);
          }
          return schemaCache.schema;
        }

        // Buscar schema com retry melhorado
        const schema = await getTenantSchemaWithRetry(currentUserId);
        
        if (!isMountedRef.current) return null;
        
        setTenantSchema(schema);
        setIsResolved(true);
        setIsLoading(false);
        
        return schema;
        
      } catch (error: any) {
        console.error('❌ useTenantSchema - Erro final na inicialização:', error);
        if (isMountedRef.current) {
          setError(error.message || 'Erro ao obter esquema do tenant');
          setIsResolved(true);
          setIsLoading(false);
        }
        return null;
      } finally {
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Verificar se já temos dados válidos no cache
    if (schemaCache.isValid && schemaCache.schema) {
      console.log('🎯 useTenantSchema - Dados válidos já disponíveis no cache');
      setTenantSchema(schemaCache.schema);
      setIsResolved(true);
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      if (!isMounted) return;
      await initializeTenantSchema();
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const ensureTenantSchema = async () => {
    try {
      console.log("🏗️ useTenantSchema - Garantindo que o esquema do tenant existe...");
      
      const { data, error } = await supabase.rpc('ensure_tenant_schema');
      
      if (error) {
        console.error('❌ Erro ao garantir esquema do tenant:', error);
        return null;
      }

      console.log(`✅ useTenantSchema - Esquema garantido: ${data}`);
      
      // Atualizar cache e estado com validação
      const currentUserId = await getCurrentUserId();
      schemaCache = {
        schema: data,
        timestamp: Date.now(),
        userId: currentUserId,
        isValid: true
      };
      
      if (isMountedRef.current) {
        setTenantSchema(data);
        setIsResolved(true);
        setError(null);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao garantir esquema do tenant:', error);
      schemaCache.isValid = false;
      return null;
    }
  };

  const invalidateCache = () => {
    console.log('🗑️ useTenantSchema - Invalidando cache...');
    schemaCache = { schema: null, timestamp: 0, userId: null, isValid: false };
    if (isMountedRef.current) {
      setTenantSchema(null);
      setIsResolved(false);
      setIsLoading(true);
      setError(null);
    }
  };

  const refreshSchema = async () => {
    console.log('🔄 useTenantSchema - Forçando refresh do schema...');
    invalidateCache();
    return await initializeTenantSchema();
  };

  return {
    tenantSchema,
    isLoading,
    isResolved,
    error,
    ensureTenantSchema,
    invalidateCache,
    refreshSchema
  };
}
