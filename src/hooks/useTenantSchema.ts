
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache global para o schema do tenant
let schemaCache: { schema: string | null; timestamp: number; userId: string | null } = {
  schema: null,
  timestamp: 0,
  userId: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

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
      console.error('❌ Erro ao obter usuário atual:', error);
      return null;
    }
  };

  const isCacheValid = (userId: string | null) => {
    const now = Date.now();
    const isValid = schemaCache.schema && 
                   schemaCache.userId === userId &&
                   (now - schemaCache.timestamp) < CACHE_DURATION;
    
    console.log('🔍 useTenantSchema - Cache validation:', {
      hasSchema: !!schemaCache.schema,
      userMatch: schemaCache.userId === userId,
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
      
      // Atualizar cache
      schemaCache = {
        schema: data,
        timestamp: Date.now(),
        userId: userId
      };
      
      return data;
    } catch (error) {
      console.error(`❌ useTenantSchema - Erro na tentativa ${attempt}:`, error);
      
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 useTenantSchema - Tentando novamente em ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return getTenantSchemaWithRetry(userId, attempt + 1);
      }
      
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeTenantSchema = async () => {
      try {
        if (!isMountedRef.current) return;
        
        console.log('🚀 useTenantSchema - Inicializando...');
        setIsLoading(true);
        setError(null);
        retryCountRef.current = 0;

        const currentUserId = await getCurrentUserId();
        
        if (!isMountedRef.current) return;

        // Verificar cache primeiro
        if (isCacheValid(currentUserId)) {
          console.log('✅ useTenantSchema - Usando schema do cache:', schemaCache.schema);
          if (isMounted) {
            setTenantSchema(schemaCache.schema);
            setIsResolved(true);
            setIsLoading(false);
          }
          return;
        }

        // Buscar schema com retry
        const schema = await getTenantSchemaWithRetry(currentUserId);
        
        if (!isMountedRef.current || !isMounted) return;
        
        setTenantSchema(schema);
        setIsResolved(true);
        
      } catch (error: any) {
        console.error('❌ useTenantSchema - Erro final:', error);
        if (isMountedRef.current && isMounted) {
          setError(error.message || 'Erro ao obter esquema do tenant');
          setIsResolved(true); // Marcar como resolvido mesmo com erro
        }
      } finally {
        if (isMountedRef.current && isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeTenantSchema();

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
      
      // Atualizar cache e estado
      const currentUserId = await getCurrentUserId();
      schemaCache = {
        schema: data,
        timestamp: Date.now(),
        userId: currentUserId
      };
      
      if (isMountedRef.current) {
        setTenantSchema(data);
        setIsResolved(true);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao garantir esquema do tenant:', error);
      return null;
    }
  };

  const invalidateCache = () => {
    console.log('🗑️ useTenantSchema - Invalidando cache...');
    schemaCache = { schema: null, timestamp: 0, userId: null };
  };

  return {
    tenantSchema,
    isLoading,
    isResolved,
    error,
    ensureTenantSchema,
    invalidateCache
  };
}
