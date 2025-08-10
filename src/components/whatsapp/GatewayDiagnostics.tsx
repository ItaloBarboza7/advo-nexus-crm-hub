
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
  const [corsTest, setCorsTest] = useState<{success: boolean, details: string} | null>(null);

  const baseUrl = import.meta.env.VITE_WHATSAPP_GATEWAY_URL || 'https://evojuris-whatsapp.onrender.com';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const isUsingProxy = !!supabaseUrl;
  const proxyUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/whatsapp-proxy` : null;

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
          details: message
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const testCorsOptions = async () => {
    setTesting(true);
    try {
      const testUrl = isUsingProxy ? `${proxyUrl}/health` : `${baseUrl}/connections`;
      
      const response = await fetch(testUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Diagnóstico Detalhado do Gateway</CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Gateway URL: <code className="bg-muted px-1 rounded">{baseUrl}</code></p>
          {isUsingProxy && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">✅ Proxy Supabase Autenticado Ativo</p>
              <p className="text-green-700">Proxy URL: <code className="bg-green-100 px-1 rounded">{proxyUrl}</code></p>
              <div className="text-green-600 text-xs mt-1 space-y-1">
                <p>• Roteamento de paths corrigido (/health, /connections, etc.)</p>
                <p>• Headers de autenticação e Origin configurados</p>
                <p>• CORS gerenciado automaticamente pelo proxy</p>
                <p>• Logging detalhado habilitado para debug</p>
              </div>
            </div>
          )}
          {!isUsingProxy && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 font-medium">⚠️ Conexão Direta (Não Recomendado)</p>
              <p className="text-yellow-700 text-xs">Conectando diretamente ao gateway - pode ter problemas de CORS e autenticação</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Teste de Conectividade */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">1. Testes de Conectividade</h3>
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
              onClick={() => openUrl(isUsingProxy ? `${proxyUrl}/health` : `${baseUrl}/health`)}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {isUsingProxy ? 'Abrir proxy /health' : 'Abrir /health'}
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
          <strong>🚀 Melhorias Implementadas:</strong>
          <div className="mt-2 space-y-1">
            <p>• ✅ Roteamento de paths corrigido no proxy (remove prefix corretamente)</p>
            <p>• ✅ Header Origin limpo (remove valores múltiplos separados por vírgula)</p>
            <p>• ✅ Autenticação Bearer token configurada automaticamente</p>
            <p>• ✅ Logging detalhado para debug de requisições e respostas</p>
            <p>• ✅ Tratamento melhorado de erros 401, 404 e conexão</p>
            <p>• ✅ Suporte completo a Server-Sent Events (SSE) para QR codes</p>
            {isUsingProxy && (
              <p>• ✅ Todas as requisições autenticadas via proxy Supabase</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GatewayDiagnostics;
