
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationResults {
  tenant_id: string;
  tenant_schema: string;
  schema_exists: boolean;
  tenant_leads_count?: number;
  global_leads_count?: number;
  timestamp: string;
}

export function useDataIntegrityValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<ValidationResults | null>(null);
  const { toast } = useToast();

  const validateIntegrity = useCallback(async (): Promise<ValidationResults | null> => {
    try {
      setIsValidating(true);
      console.log('🔍 Validando integridade dos dados do tenant...');

      const { data, error } = await supabase.rpc('validate_tenant_data_integrity');

      if (error) {
        console.error('❌ Erro na validação de integridade:', error);
        toast({
          title: "Erro na validação",
          description: "Não foi possível validar a integridade dos dados.",
          variant: "destructive"
        });
        return null;
      }

      console.log('✅ Validação de integridade concluída:', data);
      
      // Type guard and proper conversion
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const validationResults = data as unknown as ValidationResults;
        setLastValidation(validationResults);
        return validationResults;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro inesperado na validação:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado durante a validação de integridade.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  const checkDataConsistency = useCallback((results: ValidationResults): boolean => {
    if (!results.schema_exists) {
      console.warn('⚠️ Schema do tenant não existe');
      return false;
    }

    const tenantCount = results.tenant_leads_count || 0;
    const globalCount = results.global_leads_count || 0;

    if (tenantCount !== globalCount) {
      console.warn('⚠️ Inconsistência detectada:', {
        tenant_leads: tenantCount,
        global_leads: globalCount
      });
      return false;
    }

    return true;
  }, []);

  return {
    validateIntegrity,
    checkDataConsistency,
    isValidating,
    lastValidation
  };
}
