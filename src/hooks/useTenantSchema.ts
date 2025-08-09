
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureTenantSchema = useCallback(async (): Promise<string | null> => {
    try {
      console.log("🏗️ useTenantSchema - Obtendo esquema do tenant...");
      setError(null);
      
      const { data, error: rpcError } = await supabase.rpc('ensure_tenant_schema');
      
      if (rpcError) {
        console.error('❌ Erro ao garantir esquema do tenant:', rpcError);
        setError(rpcError.message || "Erro ao obter esquema do tenant");
        return null;
      }
      
      const schema = data as string;
      console.log(`✅ useTenantSchema - Esquema do tenant: ${schema}`);
      
      // Garantir que a tabela completed_followups existe no esquema do tenant
      await ensureCompletedFollowupsTable(schema);
      
      setTenantSchema(schema);
      return schema;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao obter esquema do tenant:', error);
      setError(error.message || "Erro inesperado");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureCompletedFollowupsTable = async (schema: string) => {
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
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao criar tabela completed_followups:', error);
    }
  };

  useEffect(() => {
    ensureTenantSchema();
  }, [ensureTenantSchema]);

  return {
    tenantSchema,
    isLoading,
    error,
    ensureTenantSchema
  };
}
