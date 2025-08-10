
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WhatsAppConnectionItem } from "@/components/WhatsAppConnectionItem";
import { CreateWhatsAppConnectionDialog } from "@/components/CreateWhatsAppConnectionDialog";
import { EditWhatsAppConnectionDialog } from "@/components/EditWhatsAppConnectionDialog";
import { Plus, MessageSquare } from "lucide-react";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { WhatsAppConnection } from "@/types/whatsapp";

export function AtendimentoContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<WhatsAppConnection | null>(null);
  
  const { connections, isLoading } = useWhatsAppConnections();

  const handleCreateConnection = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditConnection = (connection: WhatsAppConnection) => {
    setEditingConnection(connection);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Atendimento</h1>
            <p className="text-muted-foreground">
              Gerencie suas conexões WhatsApp
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atendimento</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões WhatsApp para atendimento
          </p>
        </div>
        <Button onClick={handleCreateConnection} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Conexão
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Nenhuma conexão WhatsApp
              </h3>
              <p className="text-muted-foreground max-w-md">
                Conecte seus números WhatsApp para começar a gerenciar atendimentos
                diretamente da plataforma.
              </p>
            </div>
            <Button onClick={handleCreateConnection} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Conectar WhatsApp
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <WhatsAppConnectionItem
              key={connection.id}
              connection={connection}
              onEdit={() => handleEditConnection(connection)}
            />
          ))}
        </div>
      )}

      <CreateWhatsAppConnectionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      <EditWhatsAppConnectionDialog
        connection={editingConnection}
        isOpen={!!editingConnection}
        onClose={() => setEditingConnection(null)}
      />
    </div>
  );
}
