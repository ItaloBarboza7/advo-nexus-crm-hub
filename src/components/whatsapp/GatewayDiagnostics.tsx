import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { whatsappGateway, type GatewayHealthStatus } from "@/integrations/whatsapp/gateway";
import { useToast } from "@/hooks/use-toast";
import ProxyDebugPanel from "./ProxyDebugPanel";

const GatewayDiagnostics: React.FC = () => {
  const { toast } = useToast();
  const [healthStatus, setHealthStatus] = useState<GatewayHealthStatus | null>(null);
  const [connectionsTest, setConnectionsTest] = useState<{status: string, corsHeaders: boolean, details?: string} | null>(null);
  const [testing, setTesting] = useState(false);
  const [corsTest, setCorsTest] = useState<{success: boolean, details: string} | null>(null);

  // Hardcoded URLs to avoid import.meta.env issues
  const baseUrl = 'https://evojuris-whatsapp.onrender.com';
  const supabaseUrl = 'https://xltugnmjbcowsuwzkkni.supabase.co';
  const isUsingProxy = true;
  const proxyUrl = `${supabaseUrl}/functions/v1/whatsapp-proxy`;
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdHVnbm1qYmNvd3N1d3pra25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDkyNjAsImV4cCI6MjA2NDM4NTI2MH0.g-dg8YF0mK0LkDBvTzUlW8po9tT0VC-s47PFbDScmN8';

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
          details: 'Problema de conexão - verifique se o proxy e gateway estão funcionando'
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

  const testCorsOptions = async () => {
    setTesting(true);
    try {
      const testUrl = `${proxyUrl}/health`;
      
      const response = await fetch(testUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type',
          'apikey': apiKey
        }
      });
      
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      const allowMethods = response.headers.get('Access-Control-Allow-Methods');
      const allowHeaders = response.headers.get('Access-Control-Allow-Headers');
      
      if (corsHeader) {
        setCorsTest({
          success: true,
          details: `✓ CORS configurado: Origin=${corsHeader}, Methods=${allowMethods || 'N/A'}, Headers=${allowHeaders || 'N/A'}`
        });
      } else {
        setCorsTest({
          success: false,
          details: `✗ Sem headers CORS na resposta OPTIONS. Status: ${response.status}`
        });
      }
    } catch (error: any) {
      setCorsTest({
        success: false,
        details: `✗ Erro no teste OPTIONS: ${error.message}`
      });
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
      {/* Debug Panel Avançado */}
      <ProxyDebugPanel />

      {/* Painel de Diagnóstico Original */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diagnóstico Básico do Gateway</CardTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Gateway URL: <code className="bg-muted px-1 rounded">{baseUrl}</code></p>
            <div className="p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">✅ Proxy Supabase Autenticado Ativo</p>
              <p className="text-green-700">Proxy URL: <code className="bg-green-100 px-1 rounded">{proxyUrl}</code></p>
              <div className="text-green-600 text-xs mt-1 space-y-1">
                <p>• Roteamento de paths corrigido (/health, /connections, etc.)</p>
                <p>• Headers de autenticação e Origin configurados</p>
                <p>• CORS gerenciado automaticamente pelo proxy</p>
                <p>• Logging detalhado habilitado para debug</p>
                <p>• Endpoint /_debug disponível para diagnóstico completo</p>
                <p>• Header apikey adicionado para autenticação Supabase</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teste de Conectividade Básica */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Testes Básicos de Conectividade</h3>
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
                onClick={testCorsOptions}
                disabled={testing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                Testar CORS (OPTIONS)
              </Button>

              <Button
                variant="outline"
                onClick={() => openUrl(`${proxyUrl}/health`)}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir proxy /health
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
                {healthStatus.proxyUsed && (
                  <Badge variant="secondary" className="text-xs">
                    VIA PROXY AUTENTICADO
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{healthStatus.message}</p>
              <div className="flex items-center gap-2 text-xs">
                <span>CORS Headers:</span>
                <Badge variant={healthStatus.corsHeaders ? 'default' : 'default'} className="text-xs">
                  {isUsingProxy ? 'Gerenciado pelo Proxy' : (healthStatus.corsHeaders ? 'Presente' : 'Ausente')}
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

          {corsTest && (
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                {corsTest.success ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                <span className="font-medium">Teste CORS (OPTIONS)</span>
                <Badge variant={corsTest.success ? 'default' : 'destructive'}>
                  {corsTest.success ? 'OK' : 'ERRO'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{corsTest.details}</p>
            </div>
          )}

          {/* Status do Sistema Atualizado */}
          <div className="text-xs text-muted-foreground p-3 bg-green-50 rounded-lg">
            <strong>🚀 Funcionalidades Implementadas:</strong>
            <div className="mt-2 space-y-1">
              <p>• ✅ URL Supabase hardcodada para evitar problemas com import.meta.env</p>
              <p>• ✅ Endpoint /_debug para diagnóstico completo de conectividade</p>
              <p>• ✅ Tratamento melhorado de erros JSON e exibição de resposta bruta</p>
              <p>• ✅ Logs detalhados do proxy para debug de requisições e respostas</p>
              <p>• ✅ Todas as requisições autenticadas via proxy Supabase</p>
              <p>• ✅ Header apikey adicionado para autenticação com Supabase</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GatewayDiagnostics;
