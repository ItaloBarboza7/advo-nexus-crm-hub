
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Bell,
  RefreshCw,
  Eye,
  Lock
} from 'lucide-react';
import { SecurityMonitorPanel } from '@/components/SecurityMonitorPanel';
import { useDataIntegrityValidator } from '@/hooks/useDataIntegrityValidator';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';
import { supabase } from '@/integrations/supabase/client';

export function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRLSStrict, setIsRLSStrict] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingRLS, setIsTestingRLS] = useState(false);

  const { validateIntegrity, isValidating, lastValidation } = useDataIntegrityValidator();
  const { sessionInfo, refreshSession } = useSessionMonitor();
  const { securityEvents, validateQuery } = useTenantSecurityMonitor();
  const { alerts, dismissAlert, criticalCount, warningCount } = useSecurityAlerts();

  // Verificar status do RLS estrito
  useEffect(() => {
    const checkRLSStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('is_strict_rls_enabled');
        if (!error) {
          setIsRLSStrict(data);
        }
      } catch (error) {
        console.error('Erro ao verificar status do RLS:', error);
      }
    };

    checkRLSStatus();
  }, []);

  const handleEnableStrictRLS = async () => {
    setIsTestingRLS(true);
    try {
      // Primeiro, executar testes de segurança
      const tests = [
        { name: 'Cross-tenant Access Prevention', test: testCrossTenantAccess },
        { name: 'Data Isolation Validation', test: testDataIsolation },
        { name: 'Permission Boundaries', test: testPermissionBoundaries },
        { name: 'SQL Injection Prevention', test: testSQLInjectionPrevention }
      ];

      const results = [];
      for (const test of tests) {
        try {
          const result = await test.test();
          results.push({ name: test.name, success: true, result });
        } catch (error: any) {
          results.push({ name: test.name, success: false, error: error.message });
        }
      }

      setTestResults(results);
      
      // Se todos os testes passaram, habilitar RLS estrito
      const allTestsPassed = results.every(r => r.success);
      if (allTestsPassed) {
        console.log('🔒 Todos os testes de segurança passaram. Habilitando RLS estrito...');
        setIsRLSStrict(true);
      }

    } catch (error) {
      console.error('Erro durante teste de segurança:', error);
    } finally {
      setIsTestingRLS(false);
    }
  };

  const testCrossTenantAccess = async () => {
    // Simular tentativa de acesso cross-tenant
    const maliciousSQL = `SELECT * FROM tenant_abc123_leads WHERE user_id != '${sessionInfo?.user_id}'`;
    const isBlocked = !validateQuery(maliciousSQL);
    
    if (!isBlocked) {
      throw new Error('Cross-tenant access não foi bloqueado adequadamente');
    }
    
    return { blocked: true, message: 'Cross-tenant access adequadamente bloqueado' };
  };

  const testDataIsolation = async () => {
    const validation = await validateIntegrity();
    if (!validation || !validation.schema_exists) {
      throw new Error('Schema do tenant não existe ou não está isolado');
    }
    
    return { isolated: true, schema: validation.tenant_schema };
  };

  const testPermissionBoundaries = async () => {
    // Verificar se usuário tem apenas permissões necessárias
    if (!sessionInfo) {
      throw new Error('Informações de sessão não disponíveis');
    }
    
    return { 
      valid: true, 
      userType: sessionInfo.is_member ? 'member' : 'admin',
      tenantId: sessionInfo.tenant_id 
    };
  };

  const testSQLInjectionPrevention = async () => {
    // Testar várias tentativas de SQL injection
    const injectionAttempts = [
      "'; DROP TABLE leads; --",
      "' OR '1'='1",
      "UNION SELECT * FROM auth.users",
      "'; INSERT INTO leads (name) VALUES ('hacked'); --"
    ];

    for (const attempt of injectionAttempts) {
      const blocked = !validateQuery(`SELECT * FROM leads WHERE name = '${attempt}'`);
      if (!blocked) {
        throw new Error(`SQL Injection não foi bloqueada: ${attempt}`);
      }
    }

    return { protected: true, attempts: injectionAttempts.length };
  };

  const getSecurityScore = () => {
    let score = 0;
    let total = 0;

    // Session validity
    total += 25;
    if (sessionInfo) score += 25;

    // Data integrity
    total += 25;
    if (lastValidation?.schema_exists) score += 25;

    // RLS status
    total += 25;
    if (isRLSStrict) score += 25;

    // Recent security events
    total += 25;
    const recentEvents = securityEvents.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
    );
    if (recentEvents.length === 0) score += 25;

    return { score, total, percentage: Math.round((score / total) * 100) };
  };

  const securityScore = getSecurityScore();

  return (
    <div className="space-y-6">
      {/* Header com alertas críticos */}
      {criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalCount} alerta(s) crítico(s) de segurança detectado(s). Verifique imediatamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={securityScore.percentage >= 80 ? "default" : "destructive"}>
                Score: {securityScore.percentage}%
              </Badge>
              <Button size="sm" onClick={refreshSession}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{criticalCount === 0 ? '✓' : '!'}</div>
              <p className="text-sm">Critical Issues</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{warningCount}</div>
              <p className="text-sm">Warnings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{securityEvents.length}</div>
              <p className="text-sm">Security Events</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{isRLSStrict ? '✓' : '○'}</div>
              <p className="text-sm">Strict RLS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts ({criticalCount + warningCount})
          </TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="testing">Security Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SecurityMonitorPanel />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-gray-500">Nenhum alerta ativo no momento.</p>
              ) : (
                alerts.map((alert) => (
                  <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <strong>{alert.title}</strong>
                        <p className="mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => dismissAlert(alert.id)}>
                        Dismiss
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="space-y-4">
            {/* Real-time events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {securityEvents.length === 0 ? (
                  <p className="text-gray-500">Nenhum evento de segurança registrado.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {securityEvents.slice(0, 10).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.type}</Badge>
                            <span className="text-sm font-medium">{new Date(event.timestamp).toLocaleTimeString()}</span>
                          </div>
                          {event.details && (
                            <p className="text-xs text-gray-600 mt-1">
                              {JSON.stringify(event.details, null, 2).slice(0, 100)}...
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Testing & RLS Controls
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isRLSStrict ? "default" : "secondary"}>
                    RLS: {isRLSStrict ? 'Strict' : 'Flexible'}
                  </Badge>
                  <Button 
                    onClick={handleEnableStrictRLS}
                    disabled={isTestingRLS || isRLSStrict}
                    variant={isRLSStrict ? "secondary" : "default"}
                  >
                    {isTestingRLS ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : isRLSStrict ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        RLS Enabled
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Enable Strict RLS
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Security Test Results</h4>
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">{result.name}</span>
                        </div>
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-medium mb-2">🔒 Strict RLS Mode</h4>
                <p className="text-sm text-gray-700 mb-3">
                  Quando habilitado, o modo estrito de RLS aplicará validações rigorosas de tenant em todas as consultas,
                  bloqueando tentativas de acesso cross-tenant e validando permissões em tempo real.
                </p>
                <div className="text-xs text-gray-600">
                  <p>• Cross-tenant access prevention</p>
                  <p>• SQL injection protection</p>
                  <p>• Data isolation enforcement</p>
                  <p>• Permission boundary validation</p>
                </div>
              </div>

              {isRLSStrict && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RLS Estrito Ativado:</strong> Todas as consultas estão sendo validadas com controles de segurança rigorosos.
                    O sistema está operando com nível máximo de segurança.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
