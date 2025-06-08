
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Upload, Trash2 } from "lucide-react";
import { AddLossReasonDialog } from "./AddLossReasonDialog";
import { useState } from "react";

export function GeneralSettings() {
  const [isAddLossReasonOpen, setIsAddLossReasonOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Perda</CardTitle>
          <CardDescription>
            Gerencie os motivos de perda de leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => setIsAddLossReasonOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Adicionar Motivo de Perda
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup e Exportação</CardTitle>
          <CardDescription>
            Faça backup dos seus dados ou exporte relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar Dados
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam todos os dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="destructive" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar Todos os Dados
          </Button>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita e removerá todos os leads, histórico e configurações.
          </p>
        </CardContent>
      </Card>

      <AddLossReasonDialog
        isOpen={isAddLossReasonOpen}
        onClose={() => setIsAddLossReasonOpen(false)}
        onReasonAdded={() => {
          // Callback quando um novo motivo for adicionado
          console.log("Novo motivo de perda adicionado");
        }}
      />
    </div>
  );
}
