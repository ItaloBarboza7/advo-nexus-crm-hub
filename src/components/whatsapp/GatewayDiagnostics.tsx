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
      
      if (message.includes('Rota não encontrada')) {
        setConnectionsTest({ 
          status: 'route_not_found', 
          corsHeaders: false,
          details: 'A rota GET /connections não existe no servidor'
        });
      } else if (message.includes('Erro de conexão') || message.includes('Failed to fetch')) {
        setConnectionsTest({ 
          status: 'cors_error', 
          corsHeaders: false,
          details: 'Bloqueio CORS - servidor não enviou header Access-Control-Allow-Origin'
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
      const response = await fetch(`${baseUrl}/connections`, {
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
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 font-medium">🔄 Usando Proxy Supabase</p>
              <p className="text-blue-700">Proxy URL: <code className="bg-blue-100 px-1 rounded">{proxyUrl}</code></p>
              <p className="text-blue-600 text-xs">O proxy elimina problemas de CORS automaticamente</p>
            </div>
          )}
          {!isUsingProxy && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 font-medium">⚠️ Conexão Direta</p>
              <p className="text-yellow-700 text-xs">Se houver problemas de CORS, o proxy será ativado automaticamente</p>
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

            {!isUsingProxy && (
              <Button
                variant="outline"
                onClick={testCorsOptions}
                disabled={testing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                Testar CORS (OPTIONS)
              </Button>
            )}

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
              {healthStatus.proxyUsed && (
                <Badge variant="secondary" className="text-xs">
                  VIA PROXY
                </Badge>
              )}
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

        {/* Comandos para Teste Manual */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">2. Comandos para Teste Manual</h3>
          {!isUsingProxy && (
            <div className="space-y-2">
              <div className="p-2 bg-muted rounded text-xs font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Teste Health (Direto):</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`curl -v "${baseUrl}/health"`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <code>curl -v "{baseUrl}/health"</code>
              </div>
              
              <div className="p-2 bg-muted rounded text-xs font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Teste CORS:</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(`curl -v -X OPTIONS -H "Origin: ${window.location.origin}" "${baseUrl}/connections"`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <code>curl -v -X OPTIONS -H "Origin: {window.location.origin}" "{baseUrl}/connections"</code>
              </div>
            </div>
          )}
          
          {isUsingProxy && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">✅ Usando proxy Supabase - problemas de CORS são automaticamente resolvidos</p>
              <p className="text-blue-600 text-xs mt-1">O proxy gerencia todas as requisições para o gateway WhatsApp</p>
            </div>
          )}
        </div>

        {/* Guia de Resolução */}
        {!isUsingProxy && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <strong>🔧 Guia de Resolução (Conexão Direta):</strong>
            <div className="mt-2 space-y-2">
              <div className="p-2 border-l-2 border-red-300 pl-3">
                <strong>Se "Failed to fetch" em todos os testes:</strong>
                <ul className="mt-1 space-y-1 ml-2">
                  <li>• Verifique se o servidor está rodando (abra {baseUrl}/health no navegador)</li>
                  <li>• Confirme se o servidor está bindando em 0.0.0.0:{'{process.env.PORT || 3000}'}</li>
                  <li>• Adicione middleware CORS: <code>app.use(cors())</code></li>
                  <li>• Adicione OPTIONS handler: <code>app.options('*', cors())</code></li>
                </ul>
              </div>
              
              <div className="p-2 border-l-2 border-yellow-300 pl-3">
                <strong>Se /health OK mas /connections 404:</strong>
                <ul className="mt-1 space-y-1 ml-2">
                  <li>• Implementar: <code>app.get('/connections', cors(), (req, res) =&gt; res.json([]))</code></li>
                  <li>• Verificar se todas as rotas têm middleware cors()</li>
                </ul>
              </div>

              <div className="p-2 border-l-2 border-blue-300 pl-3">
                <strong>Se CORS OK mas ainda falha:</strong>
                <ul className="mt-1 space-y-1 ml-2">
                  <li>• Verificar ordem dos middlewares (CORS deve vir antes de outras rotas)</li>
                  <li>• Não usar credentials: true se não necessário</li>
                  <li>• Testar com: <code>Access-Control-Allow-Origin: *</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {isUsingProxy && (
          <div className="text-xs text-muted-foreground p-3 bg-green-50 rounded-lg">
            <strong>✅ Status do Proxy:</strong>
            <div className="mt-2 space-y-1">
              <p>• O proxy Supabase está ativo e gerenciando as requisições</p>
              <p>• Problemas de CORS são automaticamente resolvidos</p>
              <p>• Conexões SSE (QR codes) são suportadas</p>
              <p>• Se ainda houver problemas, verifique se o gateway responde em: {baseUrl}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GatewayDiagnostics;
