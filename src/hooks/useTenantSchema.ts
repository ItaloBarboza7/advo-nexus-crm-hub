
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(globalTenantSchema);
  const [isLoading, setIsLoading] = useState<boolean>(globalIsLoading);
  const [error, setError] = useState<string | null>(globalError);
  const subscriberRef = useRef<Subscriber>();

  const ensureCompletedFollowupsTable = async (schema: string) => {
    // Evitar criar a tabela múltiplas vezes para o mesmo schema
    if (processedSchemas.has(schema)) {
      console.log(`✅ Tabela completed_followups já processada para esquema ${schema}`);
      return;
    }

    try {
      console.log(`🏗️ Garantindo tabela completed_followups no esquema ${schema}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schema}.completed_followups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID NOT NULL,
            user_id UUID NOT NULL,
            lead_status_at_completion TEXT NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            UNIQUE(lead_id, user_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_completed_followups_lead_user 
          ON ${schema}.completed_followups(lead_id, user_id);
          
          CREATE INDEX IF NOT EXISTS idx_completed_followups_completed_at 
          ON ${schema}.completed_followups(completed_at);
        `
      });

      if (error) {
        console.error('❌ Erro ao criar tabela completed_followups:', error);
      } else {
        console.log(`✅ Tabela completed_followups garantida no esquema ${schema}`);
        processedSchemas.add(schema);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao criar tabela completed_followups:', error);
    }
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
        
        // Garantir que a tabela completed_followups existe no esquema do tenant
        await ensureCompletedFollowupsTable(schema);
        
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
