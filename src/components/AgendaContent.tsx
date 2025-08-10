import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, Clock, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { IntegratedCalendar } from "@/components/IntegratedCalendar";

interface Task {
  id: string;
  date: string;
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
      description: 'Processo 123456 - Reunião com cliente para discussão de estratégias',
      assignedTo: 'João Silva'
    },
    {
      id: '2',
      date: new Date().toISOString().split('T')[0],
      time: '14:30',
      title: 'Análise de Contrato',
      description: 'Revisão contratual empresa XYZ - Cláusulas de rescisão',
      assignedTo: 'Maria Santos'
    },
    {
      id: '3',
      date: new Date().toISOString().split('T')[0],
      time: '16:00',
      title: 'Reunião com Cliente',
      description: 'Apresentação de proposta jurídica',
      assignedTo: 'Ana Costa'
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Local Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Agenda</h2>
          </div>
          <Button variant="outline" size="sm">
            Hoje
          </Button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            <Button variant="default" size="sm" className="text-xs">
              Mês
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              Agenda
            </Button>
          </div>
          
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <IntegratedCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Timeline for selected date */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold">
                    {selectedDate?.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'tarefa' : 'tarefas'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6">
              {tasksForSelectedDate.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Nenhuma tarefa agendada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você não possui tarefas para este dia
                  </p>
                  <Button onClick={openNewTaskDialog} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Tarefa
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasksForSelectedDate
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((task, index) => (
                      <div key={task.id} className="group flex hover:bg-muted/30 rounded-lg transition-colors">
                        {/* Time Column */}
                        <div className="w-20 flex-shrink-0 p-4 text-right">
                          <span className="text-sm font-medium text-muted-foreground">
                            {task.time}
                          </span>
                        </div>
                        
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center w-8 flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full bg-primary mt-5 ${index === 0 ? 'mt-5' : ''}`}></div>
                          {index < tasksForSelectedDate.length - 1 && (
                            <div className="w-px bg-border flex-1 mt-2"></div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-foreground">{task.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {task.assignedTo.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">{task.assignedTo}</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {task.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(task)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(task.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
