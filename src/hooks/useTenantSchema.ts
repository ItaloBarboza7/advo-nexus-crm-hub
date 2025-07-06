
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTenantSchema() {
  const [tenantSchema, setTenantSchema] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTenantSchema = async () => {
      try {
        console.log("🏗️ useTenantSchema - Obtendo esquema do tenant...");
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase.rpc('get_tenant_schema');
        
        if (error) {
          console.error('❌ Erro ao obter esquema do tenant:', error);
          setError(error.message);
          return;
        }

        console.log(`✅ useTenantSchema - Esquema do tenant: ${data}`);
        setTenantSchema(data);
      } catch (error) {
        console.error('❌ Erro inesperado ao obter esquema do tenant:', error);
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    getTenantSchema();
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
      setTenantSchema(data);
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao garantir esquema do tenant:', error);
      return null;
    }
  };

  return {
    tenantSchema,
    isLoading,
    error,
    ensureTenantSchema
  };
}
