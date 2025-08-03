
import { useCallback } from 'react';

interface OperationMetrics {
  operation: string;
  leadId?: string;
  success: boolean;
  duration?: number;
  error?: string;
  timestamp: string;
  context: 'kanban' | 'list' | 'form';
}

export function useLeadOperationsMonitoring() {
  const logOperation = useCallback((metrics: OperationMetrics) => {
    const logEntry = {
      ...metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('📊 Lead Operation Metrics:', logEntry);
    
    // Em produção, enviar para serviço de análise
    if (process.env.NODE_ENV === 'production') {
      // Enviar métricas para serviço de monitoramento
      // analytics.track('lead_operation', logEntry);
    }
  }, []);

  const trackDeletion = useCallback((leadId: string, success: boolean, duration: number, context: 'kanban' | 'list', error?: string) => {
    logOperation({
      operation: 'delete_lead',
      leadId,
      success,
      duration,
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }, [logOperation]);

  const trackCreation = useCallback((success: boolean, duration: number, error?: string) => {
    logOperation({
      operation: 'create_lead',
      success,
      duration,
      error,
      context: 'form',
      timestamp: new Date().toISOString()
    });
  }, [logOperation]);

  const trackUpdate = useCallback((leadId: string, success: boolean, duration: number, context: 'kanban' | 'list', error?: string) => {
    logOperation({
      operation: 'update_lead',
      leadId,
      success,
      duration,
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }, [logOperation]);

  return {
    trackDeletion,
    trackCreation,
    trackUpdate,
    logOperation
  };
}
