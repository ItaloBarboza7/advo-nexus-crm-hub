
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, WifiOff, Wifi, Settings, RefreshCw, AlertTriangle } from "lucide-react";
import { whatsappGateway, type GatewayConnection } from "@/integrations/whatsapp/gateway";
import NewConnectionDialog from "./NewConnectionDialog";
import { useToast } from "@/hooks/use-toast";

const ConnectionsPanel: React.FC = () => {
  const { toast } = useToast();
  const [connections, setConnections] = useState<GatewayConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [reconnectId, setReconnectId] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const loadConnections = async () => {
    setLoading(true);
    setGatewayError(null);
    try {
      const list = await whatsappGateway.listConnections();
      setConnections(list);
      console.log('Conexões carregadas:', list);
    } catch (e: any) {
      console.error('listConnections error', e);
      setGatewayError(e?.message ?? 'Falha inesperada');
      toast({ 
        title: 'Erro ao carregar conexões', 
        description: e?.message ?? 'Falha inesperada', 
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
    console.log('Settings for:', id);
    toast({ title: 'Em breve', description: 'Configurações da conexão serão adicionadas em seguida.' });
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

  if (gatewayError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Conexões</h2>
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

        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Gateway WhatsApp Indisponível</h3>
          <p className="text-red-600 mb-4">{gatewayError}</p>
          <p className="text-sm text-red-500">
            Verifique se o gateway está ativo em: https://evojuris-whatsapp.onrender.com
          </p>
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
    </div>
  );
};

export default ConnectionsPanel;
