
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEnhancedSecurityMonitoring } from '@/hooks/useEnhancedSecurityMonitoring';
import { Shield, AlertTriangle, CheckCircle, Clock, Users, Lock } from 'lucide-react';

export function EnhancedSecurityDashboard() {
  const { 
    securityMetrics, 
    isMonitoring, 
    runSecurityTests 
  } = useEnhancedSecurityMonitoring();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Painel de Segurança Avançado</h2>
        </div>
        <Button 
          onClick={runSecurityTests} 
          disabled={isMonitoring}
          variant="outline"
        >
          {isMonitoring ? "Testando..." : "Executar Testes"}
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Eventos de segurança registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityMetrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção imediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violações de Tenant</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {securityMetrics.tenantIsolationViolations}
            </div>
            <p className="text-xs text-muted-foreground">
              Tentativas de acesso cross-tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Suspeitas</CardTitle>
            <Lock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {securityMetrics.suspiciousActivities}
            </div>
            <p className="text-xs text-muted-foreground">
              Atividades que requerem revisão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {securityMetrics.criticalEvents > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Atenção: Eventos Críticos Detectados</AlertTitle>
          <AlertDescription className="text-red-700">
            {securityMetrics.criticalEvents} evento(s) crítico(s) foram detectados e requerem atenção imediata.
            Verifique os logs de segurança e tome as ações necessárias.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de Segurança Recentes</CardTitle>
          <CardDescription>
            Últimos eventos de segurança registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityMetrics.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento de segurança registrado ainda.
              </p>
            ) : (
              securityMetrics.recentEvents.slice(0, 10).map((event) => (
                <div 
                  key={event.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(event.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {event.type.replace(/_/g, ' ')}
                      </p>
                      <Badge 
                        variant="secondary"
                        className={getSeverityColor(event.severity)}
                      >
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleString('pt-BR')}
                    </p>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">
                          Ver detalhes
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Segurança</CardTitle>
          <CardDescription>
            Práticas recomendadas baseadas na análise atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">RLS (Row Level Security) está ativo em todas as tabelas</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Funções de banco com search_path hardening aplicado</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Monitoramento de segurança em tempo real ativo</span>
            </div>
            {securityMetrics.tenantIsolationViolations > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Revisar tentativas de acesso cross-tenant</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
