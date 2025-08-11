
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { whatsappGateway, type GatewayHealthStatus } from "@/integrations/whatsapp/gateway";
import { useToast } from "@/hooks/use-toast";

const GatewayDiagnostics: React.FC = () => {
  const { toast } = useToast();
  const [healthStatus, setHealthStatus] = useState<GatewayHealthStatus | null>(null);
  const [connectionsTest, setConnectionsTest] = useState<{status: string, corsHeaders: boolean, details?: string} | null>(null);
  const [testing, setTesting] = useState(false);

  // Direct connection to Render
  const baseUrl = 'https://evojuris-whatsapp.onrender.com';
  const isUsingProxy = false;

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
        proxyUsed: isUsingProxy,
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
      let details = '';
      
      if (message.includes('401')) {
        setConnectionsTest({ 
          status: 'auth_error', 
          corsHeaders: false,
          details: 'Erro 401: Token de autenticação inválido ou expirado no gateway'
        });
      } else if (message.includes('404')) {
        setConnectionsTest({ 
          status: 'route_not_found', 
          corsHeaders: false,
          details: 'Erro 404: Rota não encontrada - verifique se o path está correto'
        });
      } else if (message.includes('Rota não encontrada')) {
        setConnectionsTest({ 
          status: 'route_not_found', 
          corsHeaders: false,
          details: 'A rota GET /connections não existe no servidor'
        });
      } else if (message.includes('Erro de conexão') || message.includes('Failed to fetch')) {
        setConnectionsTest({ 
          status: 'cors_error', 
          corsHeaders: false,
          details: 'Problema de conexão - verifique se o gateway está funcionando'
        });
      } else {
        setConnectionsTest({ 
          status: 'server_error', 
          corsHeaders: false,
          details: message.substring(0, 200)
        });
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
      case 'auth_error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'route_not_found':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Comando copiado para área de transferência' });
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diagnóstico do Gateway WhatsApp</CardTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Gateway URL: <code className="bg-muted px-1 rounded">{baseUrl}</code></p>
            <div className="p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">✅ Conexão Direta com Render</p>
              <p className="text-green-700">Servidor: <code className="bg-green-100 px-1 rounded">{baseUrl}</code></p>
              <div className="text-green-600 text-xs mt-1 space-y-1">
                <p>• Comunicação direta com o servidor WhatsApp na Render</p>
                <p>• Autenticação via Bearer Token configurada</p>
                <p>• CORS configurado diretamente no servidor</p>
                <p>• Sem proxy intermediário para máxima performance</p>
                <p>• SSE (Server-Sent Events) via fetch para streams de QR</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teste de Conectividade Básica */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Testes de Conectividade</h3>
            <div className="flex items-center gap-2 flex-wrap">
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

              <Button
                variant="outline"
                onClick={() => openUrl(`${baseUrl}/health`)}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir /health
              </Button>
            </div>
          </div>

          {/* Resultados dos Testes */}
          {healthStatus && (
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(healthStatus.status)}
                <span className="font-medium">Health Check</span>
                <Badge variant={healthStatus.status === 'ok' ? 'default' : 'destructive'}>
                  {healthStatus.status === 'ok' ? 'OK' : 'ERRO'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  CONEXÃO DIRETA
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{healthStatus.message}</p>
              <div className="flex items-center gap-2 text-xs">
                <span>CORS Headers:</span>
                <Badge variant={healthStatus.corsHeaders ? 'default' : 'default'} className="text-xs">
                  {healthStatus.corsHeaders ? 'Presente' : 'Configurado no servidor'}
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
                {connectionsTest.status === 'auth_error' && (
                  <Badge variant="destructive" className="text-xs">
                    ERRO 401
                  </Badge>
                )}
                {connectionsTest.status === 'route_not_found' && (
                  <Badge variant="destructive" className="text-xs">
                    ERRO 404
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {connectionsTest.details || 'Teste realizado'}
              </p>
            </div>
          )}

          {/* Status do Sistema */}
          <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
            <strong>🚀 Configuração Atual:</strong>
            <div className="mt-2 space-y-1">
              <p>• ✅ Comunicação direta com servidor Render (sem proxy)</p>
              <p>• ✅ Autenticação Bearer Token: h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F</p>
              <p>• ✅ Endpoints disponíveis: /health, /connections, /connections/:id/qr</p>
              <p>• ✅ SSE (Server-Sent Events) implementado via fetch + ReadableStream</p>
              <p>• ✅ Tratamento de erros e reconexão automática configurados</p>
            </div>
          </div>

          {/* Comandos cURL para Debug Manual */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Comandos cURL para Teste Manual</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Teste Health:</p>
                <div className="flex items-center gap-2">
                  <code className="block bg-white p-2 rounded text-xs flex-1">
                    curl -v "{baseUrl}/health" -H "Authorization: Bearer h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F"
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`curl -v "${baseUrl}/health" -H "Authorization: Bearer h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F"`, 'Comando curl')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="font-medium">Teste Connections:</p>
                <div className="flex items-center gap-2">
                  <code className="block bg-white p-2 rounded text-xs flex-1">
                    curl -v "{baseUrl}/connections" -H "Authorization: Bearer h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F"
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`curl -v "${baseUrl}/connections" -H "Authorization: Bearer h7ViAWZDn4ZMRcy4x0zUCyYEQ11H8a6F"`, 'Comando curl')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GatewayDiagnostics;
