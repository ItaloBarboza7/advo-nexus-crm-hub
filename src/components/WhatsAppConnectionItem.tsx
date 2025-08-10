
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Phone,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppConnection } from "@/types/whatsapp";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { cn } from "@/lib/utils";

interface WhatsAppConnectionItemProps {
  connection: WhatsAppConnection;
  onEdit: () => void;
}

const statusConfig = {
  connected: {
    label: 'Conectado',
    icon: Wifi,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconClassName: 'text-green-600'
  },
  disconnected: {
    label: 'Desconectado',
    icon: WifiOff,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconClassName: 'text-red-600'
  },
  pending: {
    label: 'Conectando',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconClassName: 'text-yellow-600'
  }
};

export function WhatsAppConnectionItem({ connection, onEdit }: WhatsAppConnectionItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { deleteConnection, updateConnection } = useWhatsAppConnections();
  
  const config = statusConfig[connection.status];
  const StatusIcon = config.icon;

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja remover esta conexão?')) {
      deleteConnection(connection.id);
    }
  };

  const handleConnect = () => {
    // Aqui será implementada a lógica de conexão com a API do WhatsApp
    updateConnection({ 
      id: connection.id, 
      status: 'pending' 
    });
  };

  const handleDisconnect = () => {
    updateConnection({ 
      id: connection.id, 
      status: 'disconnected' 
    });
  };

  return (
    <Card className="p-4 transition-all hover:shadow-md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">{connection.name}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {connection.phone_number}
            </div>
          </div>

          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              
              {connection.status === 'disconnected' && (
                <DropdownMenuItem onClick={handleConnect}>
                  <Wifi className="h-4 w-4 mr-2" />
                  Conectar
                </DropdownMenuItem>
              )}
              
              {connection.status === 'connected' && (
                <DropdownMenuItem onClick={handleDisconnect}>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={config.className}>
            <StatusIcon className={cn("h-3 w-3 mr-1", config.iconClassName)} />
            {config.label}
          </Badge>

          {connection.status === 'connected' && connection.last_connected_at && (
            <span className="text-xs text-muted-foreground">
              Conectado em {new Date(connection.last_connected_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {connection.status === 'disconnected' && (
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleConnect}
            >
              <Wifi className="h-4 w-4 mr-1" />
              Conectar
            </Button>
          )}

          {connection.status === 'connected' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={handleDisconnect}
            >
              <WifiOff className="h-4 w-4 mr-1" />
              Desconectar
            </Button>
          )}

          {connection.status === 'pending' && (
            <Button size="sm" variant="outline" className="flex-1" disabled>
              <Clock className="h-4 w-4 mr-1" />
              Conectando...
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
