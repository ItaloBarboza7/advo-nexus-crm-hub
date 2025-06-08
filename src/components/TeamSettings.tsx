
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";

export function TeamSettings() {
  // Mock team data - in a real app this would come from your backend
  const teamMembers = [
    { id: 1, name: "João Silva", email: "joao@empresa.com", role: "Administrador" },
    { id: 2, name: "Maria Santos", email: "maria@empresa.com", role: "Vendedor" },
    { id: 3, name: "Pedro Costa", email: "pedro@empresa.com", role: "Vendedor" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Equipe
          </CardTitle>
          <CardDescription>
            Adicione, remova ou modifique membros da equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {teamMembers.length} membro(s) na equipe
            </p>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Membro
            </Button>
          </div>
          
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
