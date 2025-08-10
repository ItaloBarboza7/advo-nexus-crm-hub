
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Save, Plus } from "lucide-react";
import { Task } from "./types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  onSave: (task: Task) => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  existingTasks: Task[];
  editingTask: Task | null;
  onStartEdit: (id: string) => void;
}

const COLORS = [
  "hsl(225, 86%, 60%)", // brand-1
  "hsl(200, 89%, 60%)", // brand-2
  "hsl(142, 71%, 45%)", // green
  "hsl(0, 84%, 60%)",   // red
  "hsl(48, 96%, 53%)",  // yellow
  "hsl(271, 81%, 56%)", // purple
  "hsl(24, 70%, 50%)",  // orange
];

export function TaskDialog({
  open,
  onOpenChange,
  defaultDate,
  onSave,
  onUpdate,
  onDelete,
  editingTask,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [time, setTime] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setOwner(editingTask.owner || "");
      setTime(editingTask.time || "");
      setColor(editingTask.color || COLORS[0]);
      setDate(editingTask.date);
    } else {
      setTitle("");
      setDescription("");
      setOwner("");
      setTime("");
      setColor(COLORS[0]);
      setDate(format(defaultDate, "yyyy-MM-dd"));
    }
  }, [editingTask, defaultDate]);

  const handleSave = () => {
    if (!title.trim()) return;

    const task: Task = {
      id: editingTask?.id || crypto.randomUUID(),
      date,
      title: title.trim(),
      description: description.trim() || undefined,
      owner: owner.trim() || undefined,
      time: time || undefined,
      color,
    };

    if (editingTask) {
      onUpdate(task);
    } else {
      onSave(task);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingTask) {
      onDelete(editingTask.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingTask ? (
              <>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                Editar Tarefa
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Nova Tarefa
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário (opcional)</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Responsável (opcional)</Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição para a tarefa"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c 
                      ? "border-foreground scale-110" 
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {editingTask && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!title.trim()}>
                <Save className="h-4 w-4 mr-2" />
                {editingTask ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
