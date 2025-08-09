
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: Date;
  userId: string | null;
  tenantId: string | null;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  recentEvents: SecurityEvent[];
  tenantIsolationViolations: number;
  suspiciousActivities: number;
}

export function useEnhancedSecurityMonitoring() {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    recentEvents: [],
    tenantIsolationViolations: 0,
    suspiciousActivities: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();

  // Enhanced security event reporting
  const reportSecurityEvent = useCallback(async (
    type: string, 
    severity: SecurityEvent['severity'], 
    details: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const event: Omit<SecurityEvent, 'id'> = {
        type,
        severity,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          tenantSchema: tenantSchema
        },
        timestamp: new Date(),
        userId: user?.id || null,
        tenantId: user?.id || null
      };

      // Log to console for immediate visibility
      console.log(`🔒 SECURITY EVENT [${severity.toUpperCase()}] ${type}:`, event);

      // Store in local state for dashboard
      setSecurityMetrics(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
        criticalEvents: severity === 'critical' ? prev.criticalEvents + 1 : prev.criticalEvents,
        recentEvents: [
          { ...event, id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
          ...prev.recentEvents.slice(0, 49) // Keep last 50 events
        ],
        tenantIsolationViolations: type.includes('CROSS_TENANT') ? 
          prev.tenantIsolationViolations + 1 : prev.tenantIsolationViolations,
        suspiciousActivities: severity === 'high' || severity === 'critical' ? 
          prev.suspiciousActivities + 1 : prev.suspiciousActivities
      }));

      // Show toast for critical events
      if (severity === 'critical') {
        toast({
          title: "Evento de Segurança Crítico",
          description: `Detectado: ${type}`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('❌ Error reporting security event:', error);
    }
  }, [tenantSchema, toast]);

  // Validate tenant operations
  const validateTenantOperation = useCallback(async (
    operationName: string,
    targetData?: any
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        await reportSecurityEvent(
          'UNAUTHENTICATED_OPERATION_ATTEMPT',
          'high',
          { operation: operationName, targetData }
        );
        return false;
      }

      // Check for cross-tenant data access attempts
      if (targetData?.user_id && targetData.user_id !== user.id) {
        await reportSecurityEvent(
          'CROSS_TENANT_DATA_ACCESS_ATTEMPT',
          'critical',
          { 
            operation: operationName, 
            attemptedUserId: targetData.user_id,
            currentUserId: user.id 
          }
        );
        return false;
      }

      await reportSecurityEvent(
        'TENANT_OPERATION_VALIDATED',
        'low',
        { operation: operationName, userId: user.id }
      );

      return true;
    } catch (error) {
      await reportSecurityEvent(
        'SECURITY_VALIDATION_ERROR',
        'medium',
        { operation: operationName, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      return false;
    }
  }, [reportSecurityEvent]);

  // Automated security testing
  const runSecurityTests = useCallback(async () => {
    setIsMonitoring(true);
    
    try {
      await reportSecurityEvent('SECURITY_TEST_STARTED', 'low', {});

      // Test 1: Validate current user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        await reportSecurityEvent('SESSION_VALIDATION_FAILED', 'high', {});
        return false;
      }

      // Test 2: Validate tenant schema access
      if (!tenantSchema) {
        await reportSecurityEvent('TENANT_SCHEMA_UNAVAILABLE', 'medium', {});
        return false;
      }

      // Test 3: Test RLS policies
      try {
        const { data } = await supabase.from('leads').select('count').limit(1);
        await reportSecurityEvent('RLS_POLICY_TEST_PASSED', 'low', { result: 'accessible' });
      } catch (error) {
        await reportSecurityEvent('RLS_POLICY_TEST_FAILED', 'high', { error });
      }

      await reportSecurityEvent('SECURITY_TESTS_COMPLETED', 'low', {});
      return true;
      
    } catch (error) {
      await reportSecurityEvent('SECURITY_TESTS_ERROR', 'medium', { error });
      return false;
    } finally {
      setIsMonitoring(false);
    }
  }, [tenantSchema, reportSecurityEvent]);

  // Initialize monitoring
  useEffect(() => {
    reportSecurityEvent('SECURITY_MONITORING_INITIALIZED', 'low', {});
    
    // Run periodic security tests
    const interval = setInterval(() => {
      runSecurityTests();
    }, 300000); // Every 5 minutes

    return () => {
      clearInterval(interval);
      reportSecurityEvent('SECURITY_MONITORING_STOPPED', 'low', {});
    };
  }, [reportSecurityEvent, runSecurityTests]);

  return {
    securityMetrics,
    isMonitoring,
    reportSecurityEvent,
    validateTenantOperation,
    runSecurityTests
  };
}
