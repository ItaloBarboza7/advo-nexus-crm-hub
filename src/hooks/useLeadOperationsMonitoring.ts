
import { useCallback } from 'react';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';

export function useLeadOperationsMonitoring() {
  const { addDebugLog } = useLeadsDebugger();
  const { reportSecurityEvent } = useTenantSecurityMonitor();

  const trackCreation = useCallback((leadData: any) => {
    addDebugLog('LEAD_CREATION_TRACKED', {
      leadName: leadData.name,
      source: leadData.source,
      timestamp: new Date().toISOString()
    }, true);
  }, [addDebugLog]);

  const trackUpdate = useCallback((leadId: string, updates: any) => {
    addDebugLog('LEAD_UPDATE_TRACKED', {
      leadId,
      updates,
      timestamp: new Date().toISOString()
    }, true);
  }, [addDebugLog]);

  const trackDeletion = useCallback((leadId: string) => {
    addDebugLog('LEAD_DELETION_TRACKED', {
      leadId,
      timestamp: new Date().toISOString()
    }, true);
  }, [addDebugLog]);

  const monitorLeadCreation = useCallback(async (leadData: any, operation: () => Promise<any>) => {
    const startTime = Date.now();
    
    try {
      addDebugLog('LEAD_CREATE_START', {
        lead: leadData.name,
        source: leadData.source,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      const duration = Date.now() - startTime;
      
      addDebugLog('LEAD_CREATE_SUCCESS', {
        leadId: result?.id,
        leadName: leadData.name,
        duration
      }, true, duration);

      trackCreation(leadData);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      addDebugLog('LEAD_CREATE_ERROR', {
        error: error.message,
        leadName: leadData.name,
        duration
      }, false, duration);

      // Reportar erro de segurança se for relevante
      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'CREATE_LEAD',
          error: error.message,
          leadData: leadData.name
        });
      }

      throw error;
    }
  }, [addDebugLog, reportSecurityEvent, trackCreation]);

  const monitorLeadUpdate = useCallback(async (leadId: string, updates: any, operation: () => Promise<any>) => {
    const startTime = Date.now();
    
    try {
      addDebugLog('LEAD_UPDATE_START', {
        leadId,
        updates,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      const duration = Date.now() - startTime;
      
      addDebugLog('LEAD_UPDATE_SUCCESS', {
        leadId,
        updateFields: Object.keys(updates),
        duration
      }, true, duration);

      trackUpdate(leadId, updates);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      addDebugLog('LEAD_UPDATE_ERROR', {
        error: error.message,
        leadId,
        updates,
        duration
      }, false, duration);

      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'UPDATE_LEAD',
          error: error.message,
          leadId
        });
      }

      throw error;
    }
  }, [addDebugLog, reportSecurityEvent, trackUpdate]);

  const monitorLeadFetch = useCallback(async (filters: any, operation: () => Promise<any>) => {
    const startTime = Date.now();
    
    try {
      addDebugLog('LEADS_FETCH_START', {
        filters,
        timestamp: new Date().toISOString()
      }, true);

      const result = await operation();
      const leadCount = Array.isArray(result) ? result.length : 0;
      const duration = Date.now() - startTime;
      
      addDebugLog('LEADS_FETCH_SUCCESS', {
        leadCount,
        filters,
        duration
      }, true, duration);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      addDebugLog('LEADS_FETCH_ERROR', {
        error: error.message,
        filters,
        duration
      }, false, duration);

      if (error.message.includes('SECURITY') || error.message.includes('TENANT')) {
        reportSecurityEvent('LEAD_OPERATION_SECURITY_ERROR', {
          operation: 'FETCH_LEADS',
          error: error.message,
          filters
        });
      }

      throw error;
    }
  }, [addDebugLog, reportSecurityEvent]);

  return {
    monitorLeadCreation,
    monitorLeadUpdate,
    monitorLeadFetch,
    trackCreation,
    trackUpdate,
    trackDeletion
  };
}
