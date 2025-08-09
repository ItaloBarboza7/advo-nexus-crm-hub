
import { useCallback } from 'react';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';

export function useLeadOperationsMonitoring() {
  const { addDebugLog, startOperation, endOperation } = useLeadsDebugger();
  const { reportSecurityEvent } = useTenantSecurityMonitor();

  const monitorLeadCreation = useCallback(async (leadData: any, operation: () => Promise<any>) => {
    const operationId = startOperation('CREATE_LEAD', { leadName: leadData.name });
    
    try {
      addDebugLog('LEAD_CREATE_START', {
        lead: leadData.name,
        source: leadData.source,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      
      addDebugLog('LEAD_CREATE_SUCCESS', {
        leadId: result?.id,
        leadName: leadData.name
      }, true);

      endOperation(operationId, { leadId: result?.id }, true);
      return result;
    } catch (error: any) {
      addDebugLog('LEAD_CREATE_ERROR', {
        error: error.message,
        leadName: leadData.name
      }, false);

      // Reportar erro de segurança se for relevante
      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'CREATE_LEAD',
          error: error.message,
          leadData: leadData.name
        });
      }

      endOperation(operationId, { error: error.message }, false);
      throw error;
    }
  }, [addDebugLog, startOperation, endOperation, reportSecurityEvent]);

  const monitorLeadUpdate = useCallback(async (leadId: string, updates: any, operation: () => Promise<any>) => {
    const operationId = startOperation('UPDATE_LEAD', { leadId, updates });
    
    try {
      addDebugLog('LEAD_UPDATE_START', {
        leadId,
        updates,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      
      addDebugLog('LEAD_UPDATE_SUCCESS', {
        leadId,
        updateFields: Object.keys(updates)
      }, true);

      endOperation(operationId, { success: true }, true);
      return result;
    } catch (error: any) {
      addDebugLog('LEAD_UPDATE_ERROR', {
        error: error.message,
        leadId,
        updates
      }, false);

      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'UPDATE_LEAD',
          error: error.message,
          leadId
        });
      }

      endOperation(operationId, { error: error.message }, false);
      throw error;
    }
  }, [addDebugLog, startOperation, endOperation, reportSecurityEvent]);

  const monitorLeadFetch = useCallback(async (filters: any, operation: () => Promise<any>) => {
    const operationId = startOperation('FETCH_LEADS', { filters });
    
    try {
      addDebugLog('LEADS_FETCH_START', {
        filters,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      const leadCount = Array.isArray(result) ? result.length : 0;
      
      addDebugLog('LEADS_FETCH_SUCCESS', {
        leadCount,
        filters
      }, true);

      endOperation(operationId, { leadCount }, true);
      return result;
    } catch (error: any) {
      addDebugLog('LEADS_FETCH_ERROR', {
        error: error.message,
        filters
      }, false);

      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'FETCH_LEADS',
          error: error.message,
          filters
        });
      }

      endOperation(operationId, { error: error.message }, false);
      throw error;
    }
  }, [addDebugLog, startOperation, endOperation, reportSecurityEvent]);

  return {
    monitorLeadCreation,
    monitorLeadUpdate,
    monitorLeadFetch
  };
}
