
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Clock, User } from "lucide-react";
import { IntegratedCalendar } from "@/components/IntegratedCalendar";

interface Task {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string;
  title: string;
  description: string;
  assignedTo: string;
}

export function AgendaContent() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      title: 'Audiência Civil',
      description: 'Processo 123456 - Reunião com cliente',
      assignedTo: 'João Silva'
    },
    {
      id: '2',
      date: new Date().toISOString().split('T')[0],
      time: '14:30',
      title: 'Análise de Contrato',
      description: 'Revisão contratual empresa XYZ',
      assignedTo: 'Maria Santos'
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '',
    assignedTo: ''
  });

  const selectedDateStr = selectedDate?.toISOString().split('T')[0] || '';
  const tasksForSelectedDate = tasks.filter(task => task.date === selectedDateStr);

  const handleSubmit = () => {
    if (!selectedDate) return;
    
    const taskData: Task = {
      id: editingTask?.id || Date.now().toString(),
      date: selectedDateStr,
      time: formData.time,
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo
    };

    if (editingTask) {
      setTasks(prev => prev.map(task => task.id === editingTask.id ? taskData : task));
    } else {
      setTasks(prev => [...prev, taskData]);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', time: '', assignedTo: '' });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      time: task.time,
      assignedTo: task.assignedTo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const openNewTaskDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewTaskDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título da tarefa"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Horário</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Responsável</label>
                <Input
                  value={formData.assignedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição da tarefa"
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTask ? 'Atualizar' : 'Criar'} Tarefa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <IntegratedCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Tasks for selected date */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-semibold">
                Tarefas para {selectedDate?.toLocaleDateString('pt-BR')}
              </h3>
              <Badge variant="secondary">
                {tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'tarefa' : 'tarefas'}
              </Badge>
            </div>

            {tasksForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma tarefa agendada para este dia</p>
                <p className="text-sm mt-2">Clique em "Nova Tarefa" para adicionar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksForSelectedDate
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((task) => (
                    <Card key={task.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{task.time}</span>
                            <User className="h-4 w-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">{task.assignedTo}</span>
                          </div>
                          <h4 className="font-semibold mb-1">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
