
import { useEffect } from 'react';
import { useTenantSchema } from '@/hooks/useTenantSchema';

// Hook para inicializar o tenant schema globalmente
export function useTenantSchemaManager() {
  const { tenantSchema, isLoading, error, ensureTenantSchema } = useTenantSchema();

  // Garantir que o schema seja inicializado uma vez na aplicação
  useEffect(() => {
    if (!tenantSchema && !isLoading && !error) {
      console.log('🚀 TenantSchemaManager - Inicializando schema do tenant...');
      ensureTenantSchema();
    }
  }, [tenantSchema, isLoading, error, ensureTenantSchema]);

  return {
    tenantSchema,
    isLoading,
    error
  };
}
