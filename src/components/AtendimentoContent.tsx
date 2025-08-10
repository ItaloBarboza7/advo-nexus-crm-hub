
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MessageCircle, Phone, Settings, QrCode, CheckCircle, XCircle } from "lucide-react";

interface WhatsAppConnection {
  id: string;
  name: string;
  number: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastActivity: string;
}

export function AtendimentoContent() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([
    {
      id: '1',
      name: 'Atendimento Principal',
      number: '+55 11 99999-9999',
      status: 'connected',
      lastActivity: '2 minutos atrás'
    },
    {
      id: '2',
      name: 'Suporte Técnico',
      number: '+55 11 88888-8888',
      status: 'disconnected',
      lastActivity: '1 hora atrás'
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  const handleAddConnection = () => {
    if (!newConnectionName.trim()) return;
    
    const newConnection: WhatsAppConnection = {
      id: Date.now().toString(),
      name: newConnectionName,
      number: 'Pendente',
      status: 'pending',
      lastActivity: 'Aguardando conexão'
    };

    setConnections(prev => [...prev, newConnection]);
    setNewConnectionName('');
    setIsDialogOpen(false);
    setShowQRCode(true);
  };

  const getStatusIcon = (status: WhatsAppConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Settings className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: WhatsAppConnection['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Atendimento WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie suas conexões do WhatsApp Business</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Conectar Novo Número
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar Novo Número</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome da Conexão</label>
                <Input
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                  placeholder="Ex: Atendimento Vendas"
                />
              </div>
              <Button onClick={handleAddConnection} className="w-full">
                Conectar Número
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">QR Code será gerado aqui</p>
                <p className="text-xs text-gray-400 mt-1">Conecte via API do WhatsApp</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Como conectar:</p>
              <ol className="text-xs text-muted-foreground space-y-1">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Vá em Configurações → Dispositivos conectados</li>
                <li>3. Toque em "Conectar um dispositivo"</li>
                <li>4. Escaneie este QR Code</li>
              </ol>
            </div>
            <Button onClick={() => setShowQRCode(false)} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {connections.filter(c => c.status === 'connected').length}
              </p>
              <p className="text-sm text-muted-foreground">Números Conectados</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Phone className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-8 w-8 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">
                {connections.filter(c => c.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Conexões Pendentes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connections List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Números Conectados</h3>
        
        {connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum número conectado</p>
            <p className="text-sm mt-2">Clique em "Conectar Novo Número" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(connection.status)}
                      <div>
                        <h4 className="font-medium">{connection.name}</h4>
                        <p className="text-sm text-muted-foreground">{connection.number}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      {getStatusBadge(connection.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {connection.lastActivity}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                      {connection.status === 'disconnected' && (
                        <Button size="sm" variant="outline">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
