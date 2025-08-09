import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthChangeEvent } from '@supabase/supabase-js';

// Cache global para evitar múltiplas chamadas
let globalTenantSchema: string | null = null;
let globalIsLoading: boolean = false;
let globalError: string | null = null;
let schemaPromise: Promise<string | null> | null = null;
let processedSchemas = new Set<string>();

// Subscribers para notificar todos os hooks quando o estado mudar
type Subscriber = (schema: string | null, isLoading: boolean, error: string | null) => void;
const subscribers = new Set<Subscriber>();

const notifySubscribers = () => {
  subscribers.forEach(subscriber => {
    subscriber(globalTenantSchema, globalIsLoading, globalError);
  });
};

// 🔒 FUNÇÃO CRÍTICA DE SEGURANÇA: Reset completo do cache quando usuário troca
const resetTenantCache = (reason: string) => {
  console.log(`🔒 SEGURANÇA - Resetando cache do tenant por: ${reason}`);
  
  // Limpar todos os estados globais
  globalTenantSchema = null;
  globalIsLoading = false;
  globalError = null;
  schemaPromise = null;
  processedSchemas.clear();
  
  console.log('✅ Cache do tenant completamente limpo para evitar contaminação entre contas');
  
  // Notificar todos os subscribers sobre o reset
  notifySubscribers();
};

// Inicializar listener de autenticação apenas uma vez
let authListenerInitialized = false;
const initializeAuthListener = () => {
  if (authListenerInitialized) return;
  
  console.log('🔒 Inicializando listener de autenticação para proteção de dados entre contas');
  
  supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
    console.log(`🔒 EVENTO DE AUTH: ${event}`, session?.user?.id ? `Usuário: ${session.user.id}` : 'Sem usuário');
    
    // Resetar cache em TODAS as mudanças críticas de autenticação
    if (event === 'SIGNED_IN') {
      resetTenantCache(`Login de usuário: ${session?.user?.id}`);
    } else if (event === 'SIGNED_OUT') {
      resetTenantCache('Logout do usuário');
    } else if (event === 'USER_UPDATED') {
      resetTenantCache('Dados do usuário atualizados');
    } else if (event === 'TOKEN_REFRESHED') {
      resetTenantCache('Token refreshed - pode ser troca de conta');
    }
  });
  
  authListenerInitialized = true;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(globalTenantSchema);
  const [isLoading, setIsLoading] = useState<boolean>(globalIsLoading);
  const [error, setError] = useState<string | null>(globalError);
  const subscriberRef = useRef<Subscriber>();

  // Inicializar o listener de auth na primeira execução do hook
  useEffect(() => {
    initializeAuthListener();
  }, []);

  const ensureCompletedFollowupsTable = async (schema: string) => {
    // Evitar criar a tabela múltiplas vezes para o mesmo schema
    if (processedSchemas.has(schema)) {
      console.log(`✅ Tabela completed_followups já processada para esquema ${schema}`);
      return;
    }

    // A partir do endurecimento do exec_sql (somente SELECT), DDL deve ser feito no backend.
    // O ensure_tenant_schema já garante a existência desta tabela. Mantemos apenas o marcador local.
    console.log(`🔒 Skipping client-side DDL for completed_followups; ensured by ensure_tenant_schema on backend for schema ${schema}.`);
    processedSchemas.add(schema);
  };

  const ensureTenantSchema = useCallback(async (retryAttempt: number = 0): Promise<string | null> => {
    // Se já existe um cache válido, retornar imediatamente
    if (globalTenantSchema && !globalError) {
      return globalTenantSchema;
    }

    // Se já existe uma promise em andamento, aguardar ela
    if (schemaPromise) {
      return schemaPromise;
    }

    // Definir estado de loading global
    globalIsLoading = true;
    globalError = null;
    notifySubscribers();

    schemaPromise = (async (): Promise<string | null> => {
      try {
        console.log(`🏗️ useTenantSchema - Obtendo esquema do tenant (tentativa ${retryAttempt + 1})...`);
        
        const { data, error: rpcError } = await supabase.rpc('ensure_tenant_schema');
        
        if (rpcError) {
          // Retry específico para erros de concorrência XX000
          if (rpcError.code === 'XX000' && retryAttempt < 3) {
            const backoffDelay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
            console.log(`⏳ Erro de concorrência detectado, tentando novamente em ${backoffDelay}ms...`);
            
            // Limpar promise para permitir retry
            schemaPromise = null;
            
            await sleep(backoffDelay);
            return ensureTenantSchema(retryAttempt + 1);
          }

          console.error('❌ Erro ao garantir esquema do tenant:', rpcError);
          globalError = rpcError.message || "Erro ao obter esquema do tenant";
          globalIsLoading = false;
          schemaPromise = null;
          notifySubscribers();
          return null;
        }
        
        const schema = data as string;
        console.log(`✅ useTenantSchema - Esquema do tenant: ${schema}`);
        
        // Atualizar cache global
        globalTenantSchema = schema;
        globalIsLoading = false;
        globalError = null;
        schemaPromise = null;
        notifySubscribers();
        
        return schema;
      } catch (error: any) {
        // Retry específico para erros de concorrência
        if (error.message?.includes('concurrently updated') && retryAttempt < 3) {
          const backoffDelay = Math.pow(2, retryAttempt) * 1000;
          console.log(`⏳ Erro de concorrência detectado, tentando novamente em ${backoffDelay}ms...`);
          
          // Limpar promise para permitir retry
          schemaPromise = null;
          
          await sleep(backoffDelay);
          return ensureTenantSchema(retryAttempt + 1);
        }

        console.error('❌ Erro inesperado ao obter esquema do tenant:', error);
        globalError = error.message || "Erro inesperado";
        globalIsLoading = false;
        schemaPromise = null;
        notifySubscribers();
        return null;
      }
    })();

    return schemaPromise;
  }, []);

  // Subscriber para reagir a mudanças globais
  useEffect(() => {
    const subscriber: Subscriber = (schema, loading, err) => {
      setTenantSchema(schema);
      setIsLoading(loading);
      setError(err);
    };

    subscriberRef.current = subscriber;
    subscribers.add(subscriber);

    // Inicializar com valores atuais
    subscriber(globalTenantSchema, globalIsLoading, globalError);

    // Se não temos schema ainda e não estamos carregando, iniciar o processo
    if (!globalTenantSchema && !globalIsLoading && !globalError) {
      ensureTenantSchema();
    }

    return () => {
      if (subscriberRef.current) {
        subscribers.delete(subscriberRef.current);
      }
    };
  }, [ensureTenantSchema]);

  return {
    tenantSchema,
    isLoading,
    error,
    ensureTenantSchema
  };
}
