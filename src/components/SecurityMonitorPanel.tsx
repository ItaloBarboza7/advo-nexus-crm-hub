
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useDataIntegrityValidator } from '@/hooks/useDataIntegrityValidator';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { useTenantSecurityMonitor } from '@/hooks/useTenantSecurityMonitor';

export function SecurityMonitorPanel() {
  const [showDetails, setShowDetails] = useState(false);
  const { validateIntegrity, checkDataConsistency, isValidating, lastValidation } = useDataIntegrityValidator();
  const { sessionInfo, isLoading: sessionLoading, lastCheck, refreshSession } = useSessionMonitor();
  const { securityEvents, isMonitoring, lastEvent } = useTenantSecurityMonitor();

  const handleValidateIntegrity = async () => {
    const results = await validateIntegrity();
    if (results) {
      const isConsistent = checkDataConsistency(results);
      console.log('🔍 Consistência dos dados:', isConsistent ? 'OK' : 'INCONSISTENTE');
    }
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
    );
  };

  const isDataConsistent = lastValidation ? checkDataConsistency(lastValidation) : null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Monitor de Segurança</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Ocultar' : 'Detalhes'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(isMonitoring)}
            <div>
              <p className="text-sm font-medium">Monitoramento</p>
              <p className="text-xs text-gray-600">
                {isMonitoring ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(sessionInfo !== null)}
            <div>
              <p className="text-sm font-medium">Sessão</p>
              <p className="text-xs text-gray-600">
                {sessionLoading ? 'Verificando...' : sessionInfo ? 'Válida' : 'Inválida'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(isDataConsistent !== false)}
            <div>
              <p className="text-sm font-medium">Integridade</p>
              <p className="text-xs text-gray-600">
                {isValidating ? 'Validando...' : 
                 isDataConsistent === null ? 'Não verificado' :
                 isDataConsistent ? 'OK' : 'Inconsistente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Última verificação</p>
              <p className="text-xs text-gray-600">
                {lastCheck ? lastCheck.toLocaleTimeString() : 'Nunca'}
              </p>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateIntegrity}
            disabled={isValidating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Validar Integridade
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSession}
            disabled={sessionLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${sessionLoading ? 'animate-spin' : ''}`} />
            Atualizar Sessão
          </Button>
        </div>

        {/* Detalhes expandidos */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            {/* Informações da sessão */}
            {sessionInfo && (
              <div>
                <h4 className="text-sm font-medium mb-2">Informações da Sessão</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Tenant ID:</span> {sessionInfo.tenant_id.slice(0, 8)}...
                  </div>
                  <div>
                    <span className="font-medium">Schema:</span> {sessionInfo.tenant_schema}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <Badge variant={sessionInfo.is_member ? "secondary" : "default"} className="ml-1">
                      {sessionInfo.is_member ? 'Membro' : 'Admin'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Validação de integridade */}
            {lastValidation && (
              <div>
                <h4 className="text-sm font-medium mb-2">Última Validação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Schema existe:</span>
                    <Badge variant={lastValidation.schema_exists ? "default" : "destructive"} className="ml-1">
                      {lastValidation.schema_exists ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  {lastValidation.tenant_leads_count !== undefined && (
                    <div>
                      <span className="font-medium">Leads (Tenant):</span> {lastValidation.tenant_leads_count}
                    </div>
                  )}
                  {lastValidation.global_leads_count !== undefined && (
                    <div>
                      <span className="font-medium">Leads (Global):</span> {lastValidation.global_leads_count}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Eventos de segurança */}
            {securityEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Eventos Recentes ({securityEvents.length})</h4>
                <div className="space-y-1">
                  {securityEvents.slice(0, 3).map((event, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event.type}</span>
                        <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {event.details && (
                        <p className="text-gray-600 mt-1">{JSON.stringify(event.details)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
