
import { useState, useCallback, useEffect } from 'react';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';

export interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: Date;
  dismissed: boolean;
  source: string;
  details?: any;
}

export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const { securityEvents } = useTenantSecurityMonitor();

  // Gerar alertas baseado nos eventos de segurança
  useEffect(() => {
    const newAlerts: SecurityAlert[] = [];

    // Processar eventos recentes (últimas 24 horas)
    const recentEvents = securityEvents.filter(event => 
      Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    // Detectar tentativas de acesso cross-tenant
    const crossTenantAttempts = recentEvents.filter(e => 
      e.type === 'CROSS_TENANT_ACCESS_BLOCKED'
    );
    
    if (crossTenantAttempts.length > 0) {
      newAlerts.push({
        id: `cross-tenant-${Date.now()}`,
        title: 'Tentativa de Acesso Cross-Tenant Detectada',
        message: `${crossTenantAttempts.length} tentativa(s) de acesso a dados de outro tenant foi(ram) bloqueada(s).`,
        severity: 'critical',
        timestamp: new Date(),
        dismissed: false,
        source: 'tenant-security-monitor',
        details: { attempts: crossTenantAttempts.length }
      });
    }

    // Detectar trocas suspeitas de usuário
    const userSwitches = recentEvents.filter(e => 
      e.type === 'USER_SWITCH_DETECTED'
    );
    
    if (userSwitches.length > 3) {
      newAlerts.push({
        id: `user-switches-${Date.now()}`,
        title: 'Múltiplas Trocas de Usuário Detectadas',
        message: `${userSwitches.length} trocas de usuário detectadas em 24h. Isso pode indicar atividade suspeita.`,
        severity: 'warning',
        timestamp: new Date(),
        dismissed: false,
        source: 'session-monitor',
        details: { switches: userSwitches.length }
      });
    }

    // Detectar erros de segurança em operações de lead
    const securityErrors = recentEvents.filter(e => 
      e.type === 'LEAD_OPERATION_SECURITY_ERROR'
    );
    
    if (securityErrors.length > 0) {
      newAlerts.push({
        id: `security-errors-${Date.now()}`,
        title: 'Erros de Segurança em Operações',
        message: `${securityErrors.length} erro(s) de segurança detectado(s) durante operações com leads.`,
        severity: 'critical',
        timestamp: new Date(),
        dismissed: false,
        source: 'lead-operations-monitor',
        details: { errors: securityErrors.length }
      });
    }

    // Atualizar apenas se houver novos alertas
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        // Evitar duplicatas
        const existingIds = new Set(prev.map(a => a.id));
        const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
        
        if (uniqueNewAlerts.length > 0) {
          return [...prev, ...uniqueNewAlerts].slice(0, 20); // Manter apenas 20 alertas mais recentes
        }
        return prev;
      });
    }
  }, [securityEvents]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ).filter(alert => !alert.dismissed));
  }, []);

  const createManualAlert = useCallback((
    title: string, 
    message: string, 
    severity: SecurityAlert['severity'] = 'info',
    details?: any
  ) => {
    const newAlert: SecurityAlert = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      severity,
      timestamp: new Date(),
      dismissed: false,
      source: 'manual',
      details
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 20));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.severity === 'info').length;

  return {
    alerts: activeAlerts,
    allAlerts: alerts,
    criticalCount,
    warningCount,
    infoCount,
    totalCount: activeAlerts.length,
    dismissAlert,
    createManualAlert,
    clearAllAlerts
  };
}
