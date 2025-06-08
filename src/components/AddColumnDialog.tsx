
import { useState } from "react";
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

interface AddColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (columnData: { name: string; color: string; order: number }) => void;
  maxOrder: number;
}

export function AddColumnDialog({ isOpen, onClose, onAddColumn, maxOrder }: AddColumnDialogProps) {
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("#3B82F6");
  const [columnOrder, setColumnOrder] = useState(maxOrder + 1);

  const handleSubmit = () => {
    if (!columnName.trim()) {
      return;
    }

    onAddColumn({
      name: columnName.trim(),
      color: columnColor,
      order: columnOrder,
    });

    // Reset form
    setColumnName("");
    setColumnColor("#3B82F6");
    setColumnOrder(maxOrder + 1);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setColumnName("");
    setColumnColor("#3B82F6");
    setColumnOrder(maxOrder + 1);
    onClose();
  };

  // Generate order options
  const orderOptions = Array.from({ length: maxOrder + 1 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Coluna do Kanban</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="column-name">Nome da Coluna</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!columnName.trim()}>
            Criar Coluna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
