
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';
import { useToast } from '@/hooks/use-toast';

interface SecurityValidatedOperation {
  validateAndExecute: <T>(
    operation: () => Promise<T>,
    operationName: string,
    operationData?: any
  ) => Promise<T>;
  isExecuting: boolean;
}

export function useSecurityEnhancedOperations(): SecurityValidatedOperation {
  const [isExecuting, setIsExecuting] = useState(false);
  const { validateQuery, reportSecurityEvent } = useTenantSecurityMonitor();
  const { toast } = useToast();

  const validateAndExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    operationData?: any
  ): Promise<T> => {
    if (isExecuting) {
      throw new Error('Operação já em execução');
    }

    setIsExecuting(true);

    try {
      // Log início da operação
      console.log(`🔒 [SECURITY] Iniciando operação validada: ${operationName}`, operationData);
      
      reportSecurityEvent('OPERATION_STARTED', {
        operationName,
        operationData: operationData ? JSON.stringify(operationData).slice(0, 200) : null,
        timestamp: new Date().toISOString()
      });

      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Executar operação
      const startTime = Date.now();
      const result = await operation();
      const executionTime = Date.now() - startTime;

      // Log sucesso
      console.log(`✅ [SECURITY] Operação completada com sucesso: ${operationName} (${executionTime}ms)`);
      
      reportSecurityEvent('OPERATION_COMPLETED', {
        operationName,
        executionTime,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      console.error(`❌ [SECURITY] Falha na operação: ${operationName}`, error);
      
      reportSecurityEvent('OPERATION_FAILED', {
        operationName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      // Mostrar toast de erro para operações críticas
      if (operationName.includes('delete') || operationName.includes('update')) {
        toast({
          title: "Erro de Segurança",
          description: `Operação ${operationName} falhou: ${errorMessage}`,
          variant: "destructive",
        });
      }

      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, validateQuery, reportSecurityEvent, toast]);

  return {
    validateAndExecute,
    isExecuting
  };
}
