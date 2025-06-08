
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings } from "lucide-react";

export function KanbanSettings() {
  // Mock columns data - in a real app this would come from your backend
  const columns = [
    { id: 1, name: "Novo Lead", color: "bg-blue-500" },
    { id: 2, name: "Contato", color: "bg-yellow-500" },
    { id: 3, name: "Proposta", color: "bg-orange-500" },
    { id: 4, name: "Negociação", color: "bg-purple-500" },
    { id: 5, name: "Finalizado", color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Quadro Kanban
          </CardTitle>
          <CardDescription>
            Configure as colunas e fluxo do seu quadro Kanban
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {columns.length} coluna(s) configurada(s)
            </p>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Coluna
            </Button>
          </div>
          
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${column.color}`}></div>
                  <span className="font-medium">{column.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    Excluir
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
