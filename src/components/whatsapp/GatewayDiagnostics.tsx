
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { whatsappGateway, type GatewayHealthStatus } from "@/integrations/whatsapp/gateway";

const GatewayDiagnostics: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<GatewayHealthStatus | null>(null);
  const [connectionsTest, setConnectionsTest] = useState<{status: string, corsHeaders: boolean} | null>(null);
  const [testing, setTesting] = useState(false);

  const testHealth = async () => {
    setTesting(true);
    try {
      const status = await whatsappGateway.testHealth();
      setHealthStatus(status);
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: 'Falha ao testar health check',
        corsHeaders: false,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  const testConnections = async () => {
    setTesting(true);
    try {
      await whatsappGateway.listConnections();
      setConnectionsTest({ status: 'success', corsHeaders: true });
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido';
      if (message.includes('Rota não encontrada')) {
        setConnectionsTest({ status: 'route_not_found', corsHeaders: false });
      } else if (message.includes('Erro de conexão')) {
        setConnectionsTest({ status: 'cors_error', corsHeaders: false });
      } else {
        setConnectionsTest({ status: 'server_error', corsHeaders: false });
      }
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
      case 'cors_error':
      case 'server_error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'route_not_found':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = (test: typeof connectionsTest) => {
    if (!test) return null;
    
    switch (test.status) {
      case 'success':
        return 'Rota /connections funcionando corretamente';
      case 'route_not_found':
        return 'Rota /connections não encontrada - Gateway precisa implementar esta rota';
      case 'cors_error':
        return 'Erro CORS - Gateway precisa configurar Access-Control-Allow-Origin';
      case 'server_error':
        return 'Erro do servidor - Verifique logs do gateway';
      default:
        return 'Status desconhecido';
    }
  };

  const baseUrl = import.meta.env.VITE_WHATSAPP_GATEWAY_URL || 'https://evojuris-whatsapp.onrender.com';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Diagnóstico do Gateway</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gateway URL: <code className="bg-muted px-1 rounded">{baseUrl}</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={testHealth}
            disabled={testing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            Testar /health
          </Button>
          
          <Button
            variant="outline"
            onClick={testConnections}
            disabled={testing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            Testar /connections
          </Button>
        </div>

        {healthStatus && (
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(healthStatus.status)}
              <span className="font-medium">Health Check</span>
              <Badge variant={healthStatus.status === 'ok' ? 'default' : 'destructive'}>
                {healthStatus.status === 'ok' ? 'OK' : 'ERRO'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{healthStatus.message}</p>
            <div className="flex items-center gap-2 text-xs">
              <span>CORS Headers:</span>
              <Badge variant={healthStatus.corsHeaders ? 'default' : 'destructive'} className="text-xs">
                {healthStatus.corsHeaders ? 'Presente' : 'Ausente'}
              </Badge>
            </div>
          </div>
        )}

        {connectionsTest && (
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(connectionsTest.status)}
              <span className="font-medium">Teste /connections</span>
              <Badge variant={connectionsTest.status === 'success' ? 'default' : 'destructive'}>
                {connectionsTest.status === 'success' ? 'OK' : 'ERRO'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{getStatusMessage(connectionsTest)}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <strong>Próximos passos:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Se /health falhar: Gateway não está respondendo</li>
            <li>• Se /connections retornar 404: Implementar rota GET /connections no gateway</li>
            <li>• Se houver erro CORS: Adicionar middleware CORS no gateway</li>
            <li>• Configurar VITE_WHATSAPP_GATEWAY_URL se usando URL diferente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GatewayDiagnostics;
