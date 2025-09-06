import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, WifiOff, Wifi, Settings, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { whatsappGateway, type GatewayConnection } from "@/integrations/whatsapp/gateway";
import NewConnectionDialog from "./NewConnectionDialog";
import GatewayDiagnostics from "./GatewayDiagnostics";
import { ConnectionSettingsDialog } from "./ConnectionSettingsDialog";
import { useToast } from "@/hooks/use-toast";

const ConnectionsPanel: React.FC = () => {
  const { toast } = useToast();
  const [connections, setConnections] = useState<GatewayConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [reconnectId, setReconnectId] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [errorType, setErrorType] = useState<'cors' | 'route_missing' | 'server_down' | 'unknown'>('unknown');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<GatewayConnection | null>(null);

  const baseUrl = import.meta.env.VITE_WHATSAPP_GATEWAY_URL || 'https://evojuris-whatsapp.onrender.com';

  const loadConnections = async () => {
    setLoading(true);
    setGatewayError(null);
    setErrorType('unknown');
    
    try {
      const list = await whatsappGateway.listConnections();
      setConnections(list);
      console.log('Conexões carregadas:', list);
    } catch (e: any) {
      console.error('listConnections error', e);
      const errorMessage = e?.message ?? 'Falha inesperada';
      setGatewayError(errorMessage);
      
      // Classify error type for better UX
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Erro de conexão')) {
        setErrorType('cors');
        setShowDiagnostics(true);
      } else if (errorMessage.includes('Rota não encontrada') || errorMessage.includes('404')) {
        setErrorType('route_missing');
        setShowDiagnostics(true);
      } else if (errorMessage.includes('5')) {
        setErrorType('server_down');
      } else {
        setErrorType('unknown');
      }
      
      let toastTitle = 'Erro ao carregar conexões';
      let toastDescription = errorMessage;
      
      if (errorType === 'cors') {
        toastTitle = 'Gateway sem CORS';
        toastDescription = 'O servidor WhatsApp não está configurado para aceitar requisições do navegador';
      } else if (errorType === 'route_missing') {
        toastTitle = 'Rota não implementada';
        toastDescription = 'A rota /connections não foi encontrada no gateway WhatsApp';
      } else if (errorType === 'server_down') {
        toastTitle = 'Servidor indisponível';
        toastDescription = 'O gateway WhatsApp não está respondendo';
      }
      
      toast({ 
        title: toastTitle, 
        description: toastDescription, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleNewConnection = () => {
    setReconnectId(null);
    setNewDialogOpen(true);
  };

  const handleConnected = () => {
    loadConnections();
  };

  const handleConnect = (id: string) => {
    setReconnectId(id);
    setNewDialogOpen(true);
  };

  const handleSettings = (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection) {
      setSelectedConnection(connection);
      setSettingsDialogOpen(true);
    }
  };

  const handleConnectionUpdated = () => {
    loadConnections();
  };

  const handleConnectionDeleted = () => {
    loadConnections();
  };

  const statusBadge = (status: string) => {
    if (status === 'connected') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full px-3 py-1 text-xs font-medium">
          Conectado
        </Badge>
      );
    }
    if (status === 'connecting') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 rounded-full px-3 py-1 text-xs font-medium">
          Conectando
        </Badge>
      );
    }
    return (
      <Badge className="bg-sky-50 text-sky-700 border-sky-200 rounded-full px-3 py-1 text-xs font-medium">
        Desconectado
      </Badge>
    );
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'cors':
        return <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />;
      case 'route_missing':
        return <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />;
      case 'server_down':
        return <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'cors':
        return 'Problema de CORS no Gateway';
      case 'route_missing':
        return 'Rota Não Implementada';
      case 'server_down':
        return 'Servidor Indisponível';
      default:
        return 'Gateway WhatsApp com Problemas';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'cors':
        return 'O servidor não está enviando os headers CORS necessários. Configure o middleware CORS no gateway.';
      case 'route_missing':
        return 'A rota GET /connections não foi implementada no servidor. Adicione esta rota ao seu gateway.';
      case 'server_down':
        return 'O servidor WhatsApp não está respondendo. Verifique se o serviço está ativo.';
      default:
        return gatewayError || 'Erro desconhecido na comunicação com o gateway.';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (errorType === 'cors' || errorType === 'route_missing') {
      actions.push(
        <Button
          key="docs"
          variant="outline"
          onClick={() => window.open('https://docs.lovable.dev', '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ver Documentação
        </Button>
      );
    }
    
    actions.push(
      <Button
        key="test"
        variant="outline"
        onClick={() => window.open(`${baseUrl}/health`, '_blank')}
        className="flex items-center gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        Testar Gateway
      </Button>
    );

    return actions;
  };

  if (gatewayError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Conexões</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showDiagnostics ? 'Ocultar' : 'Mostrar'} Diagnóstico
            </Button>
            <Button
              variant="outline"
              onClick={loadConnections}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Tentar Novamente
            </Button>
          </div>
        </div>

        {showDiagnostics && <GatewayDiagnostics />}

        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          {getErrorIcon()}
          <h3 className="text-lg font-semibold text-red-800 mb-2">{getErrorTitle()}</h3>
          <p className="text-red-600 mb-6">{getErrorDescription()}</p>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            {getQuickActions()}
          </div>
          
          <div className="text-sm text-red-500 space-y-1">
            <p>Gateway configurado: <code className="bg-red-100 px-1 rounded">{baseUrl}</code></p>
            <p>Use o diagnóstico acima para identificar e corrigir o problema</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Conexões</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Diagnóstico
          </Button>
          <Button
            variant="outline"
            onClick={loadConnections}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={handleNewConnection} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Nova Conexão</span>
          </Button>
        </div>
      </div>

      {showDiagnostics && <GatewayDiagnostics />}

      <div className="space-y-4">
        {connections.length === 0 && !loading && (
          <div className="rounded-xl border bg-card px-6 py-10 text-center text-muted-foreground">
            Nenhuma conexão encontrada. Crie uma nova para começar.
          </div>
        )}

        {connections.map((connection) => (
          <div
            key={connection.id}
            className="rounded-xl border border-border bg-card px-6 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              {/* Left side - Avatar and info */}
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted border border-border rounded-full flex items-center justify-center">
                  {connection.status === 'connected' ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{connection.name}</h3>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>{connection.phone_number || 'Não configurado'}</span>
                  </div>
                  {connection.last_connected_at && (
                    <p className="text-xs text-muted-foreground/70">
                      Última conexão: {new Date(connection.last_connected_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side - Badge and buttons */}
              <div className="flex items-center space-x-3">
                {statusBadge(connection.status)}
                
                {connection.status !== 'connected' && (
                  <Button 
                    onClick={() => handleConnect(connection.id)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-sm"
                  >
                    Conectar
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleSettings(connection.id)}
                  className="border-border bg-background hover:bg-accent h-9 w-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NewConnectionDialog
        open={newDialogOpen}
        onOpenChange={(v) => {
          setNewDialogOpen(v);
          if (!v) setReconnectId(null);
        }}
        onConnected={handleConnected}
        initialConnectionId={reconnectId ?? undefined}
      />

      <ConnectionSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        connection={selectedConnection}
        onUpdated={handleConnectionUpdated}
        onDeleted={handleConnectionDeleted}
      />
    </div>
  );
};

export default ConnectionsPanel;
