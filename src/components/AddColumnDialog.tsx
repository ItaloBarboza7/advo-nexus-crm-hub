
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
import { Trash2 } from "lucide-react";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnAdded: () => void;
}

export function AddColumnDialog({ open, onOpenChange, onColumnAdded }: AddColumnDialogProps) {
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3B82F6");
  const [columnOrder, setColumnOrder] = useState(1);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<KanbanColumn | null>(null);
  const { toast } = useToast();

  const fetchKanbanColumns = async () => {
    setIsLoadingColumns(true);
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar colunas:', error);
        return;
      }

      setKanbanColumns(data || []);
      // Set the next order position
      if (data && data.length > 0) {
        const maxOrder = Math.max(...data.map(col => col.order_position));
        setColumnOrder(maxOrder + 1);
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar colunas:', error);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const handleSubmit = async () => {
    if (!columnName.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .insert({
          name: columnName.trim(),
          color: columnColor,
          order_position: columnOrder,
        });

      if (error) {
        console.error('Erro ao criar coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar a coluna.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Coluna criada com sucesso.",
      });

      // Reset form
      setColumnName("");
      setColumnColor("#3B82F6");
      
      // Refresh columns and call parent callback
      await fetchKanbanColumns();
      onColumnAdded();
    } catch (error) {
      console.error('Erro inesperado ao criar coluna:', error);
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
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnToDelete.id);

      if (error) {
        console.error('Erro ao excluir coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso.",
      });

      fetchKanbanColumns();
      onColumnAdded(); // Refresh parent data
    } catch (error) {
      console.error('Erro inesperado ao excluir coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setColumnName("");
    setColumnColor("#3B82F6");
    onOpenChange(false);
  };

  // Generate order options
  const maxOrder = kanbanColumns.length > 0 ? Math.max(...kanbanColumns.map(col => col.order_position)) : 0;
  const orderOptions = Array.from({ length: maxOrder + 1 }, (_, i) => i + 1);

  // Carregar colunas quando o diálogo abre
  useEffect(() => {
    if (open) {
      fetchKanbanColumns();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
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
            <h4 className="text-sm font-medium mb-3">Colunas Existentes</h4>
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
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
