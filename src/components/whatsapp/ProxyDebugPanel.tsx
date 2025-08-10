
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, CheckCircle, XCircle, AlertTriangle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DebugTest {
  test: string;
  status?: number;
  success: boolean;
  body?: string;
  error?: string;
  headers_sent?: Record<string, string>;
}

interface DebugResponse {
  gateway_url: string;
  gateway_base: string;
  origin: string;
  has_token: boolean;
  token_preview?: string;
  tests: DebugTest[];
  timestamp: string;
  error?: string;
}

const ProxyDebugPanel: React.FC = () => {
  const { toast } = useToast();
  const [debugResult, setDebugResult] = useState<DebugResponse | null>(null);
  const [testing, setTesting] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const debugUrl = `${supabaseUrl}/functions/v1/whatsapp-proxy/_debug`;

  const runDebugTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(debugUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      setDebugResult(result);

      if (result.error) {
        toast({
          title: 'Erro no Debug',
          description: result.error,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Debug Concluído',
          description: `${result.tests.length} testes executados`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro de Conexão',
        description: `Falha ao executar debug: ${error.message}`,
        variant: 'destructive'
      });
      setDebugResult(null);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado para área de transferência` });
  };

  const getTestIcon = (test: DebugTest) => {
    if (test.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (test.error) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (test: DebugTest) => {
    if (test.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">✓ {test.status}</Badge>;
    } else if (test.status) {
      return <Badge variant="destructive">✗ {test.status}</Badge>;
    } else {
      return <Badge variant="destructive">ERRO</Badge>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Debug Avançado do Proxy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Teste de conectividade detalhado entre o proxy Supabase e o gateway WhatsApp
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={runDebugTest}
            disabled={testing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Executando Debug...' : 'Executar Debug Completo'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => copyToClipboard(debugUrl, 'URL do Debug')}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar URL Debug
          </Button>
        </div>

        {debugResult && (
          <div className="space-y-4">
            {/* Configuração do Gateway */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Configuração do Gateway</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Gateway Base:</strong> <code>{debugResult.gateway_base}</code></p>
                <p><strong>Gateway Health URL:</strong> <code>{debugResult.gateway_url}</code></p>
                <p><strong>Origin:</strong> <code>{debugResult.origin}</code></p>
                <p><strong>Token:</strong> {debugResult.has_token ? 
                  <span className="text-green-600">✓ Configurado ({debugResult.token_preview})</span> : 
                  <span className="text-red-600">✗ Não configurado</span>
                }</p>
                <p><strong>Timestamp:</strong> {new Date(debugResult.timestamp).toLocaleString()}</p>
              </div>
            </div>

            {/* Resultados dos Testes */}
            <div className="space-y-3">
              <h3 className="font-medium">Resultados dos Testes de Conectividade</h3>
              {debugResult.tests.map((test, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTestIcon(test)}
                      <span className="font-medium">{test.test}</span>
                    </div>
                    {getStatusBadge(test)}
                  </div>
                  
                  {test.error && (
                    <div className="text-red-600 text-sm mb-2">
                      <strong>Erro:</strong> {test.error}
                    </div>
                  )}
                  
                  {test.body && (
                    <div className="text-sm">
                      <strong>Resposta:</strong>
                      <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">
                        {test.body}
                      </pre>
                    </div>
                  )}
                  
                  {test.headers_sent && (
                    <details className="text-sm mt-2">
                      <summary className="cursor-pointer text-muted-foreground">Headers Enviados</summary>
                      <pre className="bg-gray-50 p-2 rounded text-xs mt-1">
                        {JSON.stringify(test.headers_sent, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Comandos cURL */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Comandos cURL para Teste Manual</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Teste direto no gateway:</p>
                  <code className="block bg-white p-2 rounded text-xs">
                    curl -v "{debugResult.gateway_url}" -H "Origin: {debugResult.origin}"
                    {debugResult.has_token && ` -H "Authorization: Bearer YOUR_TOKEN"`}
                  </code>
                </div>
                <div>
                  <p className="font-medium">Teste via proxy debug:</p>
                  <code className="block bg-white p-2 rounded text-xs">
                    curl -v "{debugUrl}"
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProxyDebugPanel;
