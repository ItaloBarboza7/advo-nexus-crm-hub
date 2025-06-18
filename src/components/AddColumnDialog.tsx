import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { Trash2 } from "lucide-react";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

interface AddColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (columnData: { name: string; color: string; order: number }) => void;
  maxOrder: number;
}

export function AddColumnDialog({ isOpen, onClose, onAddColumn, maxOrder }: AddColumnDialogProps) {
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3B82F6");
  const defaultOrder = maxOrder > 0 ? maxOrder + 1 : 1;
  const [columnOrder, setColumnOrder] = useState(defaultOrder);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<KanbanColumn | null>(null);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const fetchKanbanColumns = async () => {
    setIsLoadingColumns(true);
    try {
      console.log("🏗️ AddColumnDialog - Carregando colunas SOMENTE do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, color, order_position, is_default FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

      if (error) {
        console.error('❌ Erro ao buscar colunas do tenant:', error);
        return;
      }

      const columnsData = Array.isArray(data) ? data : [];
      console.log(`✅ AddColumnDialog - ${columnsData.length} colunas carregadas EXCLUSIVAMENTE do esquema ${schema}`);
      setKanbanColumns(columnsData);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar colunas do tenant:', error);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const handleSubmit = async () => {
    if (!columnName.trim()) {
      return;
    }

    try {
      console.log("💾 AddColumnDialog - Criando nova coluna SOMENTE no esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        toast({
          title: "Erro",
          description: "Não foi possível obter o esquema do tenant.",
          variant: "destructive"
        });
        return;
      }

      let safeOrder = Math.max(1, Math.min(columnOrder, maxOrder + 1));

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `INSERT INTO ${schema}.kanban_columns (name, color, order_position, is_default) VALUES ('${columnName.trim()}', '${columnColor}', ${safeOrder}, false)`
      });

      if (error) {
        console.error('❌ Erro ao criar coluna no tenant:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar a coluna.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ AddColumnDialog - Coluna criada com sucesso no esquema do tenant');
      toast({
        title: "Sucesso",
        description: "Coluna criada com sucesso!",
      });

      // Reset form
      setColumnName("");
      setColumnColor("#3B82F6");
      setColumnOrder(defaultOrder);
      
      // Refresh columns and notify parent
      await fetchKanbanColumns();
      onAddColumn({
        name: columnName.trim(),
        color: columnColor,
        order: safeOrder,
      });
    } catch (error) {
      console.error('❌ Erro inesperado ao criar coluna no tenant:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (column: KanbanColumn) => {
    if (column.is_default) {
      toast({
        title: "Ação não permitida",
        description: "Colunas padrão não podem ser excluídas.",
        variant: "destructive"
      });
      return;
    }
    setColumnToDelete(column);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!columnToDelete) return;

    try {
      console.log(`🗑️ AddColumnDialog - Deletando coluna ${columnToDelete.id} SOMENTE do esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        toast({
          title: "Erro",
          description: "Não foi possível obter o esquema do tenant.",
          variant: "destructive"
        });
        return;
      }

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `DELETE FROM ${schema}.kanban_columns WHERE id = '${columnToDelete.id}'`
      });

      if (error) {
        console.error('❌ Erro ao excluir coluna do tenant:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ AddColumnDialog - Coluna excluída com sucesso do esquema do tenant');
      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso. Todos os leads dessa coluna foram movidos para a coluna 'Novo'.",
      });

      fetchKanbanColumns();
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir coluna do tenant:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setColumnName("");
    setColumnColor("#3B82F6");
    setColumnOrder(defaultOrder);
    onClose();
  };

  const orderOptions = Array.from({ length: Math.max(1, maxOrder) + 1 }, (_, i) => i + 1);

  useEffect(() => {
    if (isOpen && tenantSchema) {
      fetchKanbanColumns();
      setColumnOrder(defaultOrder);
    }
  }, [isOpen, maxOrder, tenantSchema]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Colunas do Kanban</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-name">Nome da Nova Coluna</Label>
              <Input
                id="column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Digite o nome da nova coluna"
              />
            </div>
            
            <div>
              <Label htmlFor="column-color">Cor da Coluna</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="column-color"
                  type="color"
                  value={columnColor}
                  onChange={(e) => setColumnColor(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">{columnColor}</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="column-order">Posição da Coluna</Label>
              <Select value={columnOrder.toString()} onValueChange={(value) => setColumnOrder(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent>
                  {orderOptions.map((order) => (
                    <SelectItem key={order} value={order.toString()}>
                      Posição {order}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} disabled={!columnName.trim()} className="w-full">
              Criar Coluna
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Colunas Existentes (Privadas do Tenant)</h4>
            <div className="text-xs mb-2 text-gray-600">
              Ao excluir uma coluna, todos os leads dela serão automaticamente movidos para a coluna <span className="font-semibold text-blue-900 bg-blue-100 rounded px-1 py-0.5">Novo</span>.
            </div>
            {isLoadingColumns ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : kanbanColumns.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma coluna cadastrada</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {kanbanColumns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: column.color }}
                      ></div>
                      <span className="text-sm">{column.name}</span>
                      {column.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Padrão
                        </span>
                      )}
                    </div>
                    {!column.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(column)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={columnToDelete?.name || ""}
        itemType="a coluna do Kanban"
        description="Todos os leads dessa coluna serão movidos automaticamente para a coluna 'Novo'."
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
