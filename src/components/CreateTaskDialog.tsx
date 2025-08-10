
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgendaTasks } from "@/hooks/useAgendaTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { CreateAgendaTaskRequest } from "@/types/agenda";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
}

export function CreateTaskDialog({ isOpen, onClose, selectedDate }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<CreateAgendaTaskRequest>({
    title: '',
    description: '',
    scheduled_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
    scheduled_time: '',
    assigned_to_user_id: '',
  });

  const { createTask, isCreating } = useAgendaTasks();
  const { members, isLoading: isLoadingMembers } = useTeamMembers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduled_date || !formData.assigned_to_user_id) {
      return;
    }

    const taskData: CreateAgendaTaskRequest = {
      ...formData,
      description: formData.description || undefined,
      scheduled_time: formData.scheduled_time || undefined,
    };

    createTask(taskData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      scheduled_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      scheduled_time: '',
      assigned_to_user_id: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa para a agenda da equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Reunião com cliente..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Data *</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Horário</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Atribuir para *</Label>
            <Select
              value={formData.assigned_to_user_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to_user_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro da equipe" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingMembers ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name} {member.title && `(${member.title})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
