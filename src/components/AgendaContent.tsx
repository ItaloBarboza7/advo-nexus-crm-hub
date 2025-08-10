
import { useState } from "react";
import { IntegratedCalendar } from "@/components/IntegratedCalendar";
import { AgendaTaskList } from "@/components/AgendaTaskList";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAgendaTasks } from "@/hooks/useAgendaTasks";
import { AgendaTask } from "@/types/agenda";
import { BrazilTimezone } from "@/lib/timezone";

export function AgendaContent() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(BrazilTimezone.now());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AgendaTask | null>(null);
  
  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const { tasks } = useAgendaTasks(selectedDateStr);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateTask = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditTask = (task: AgendaTask) => {
    setEditingTask(task);
  };

  const todayStr = BrazilTimezone.now().toISOString().split('T')[0];
  const selectedDateFormatted = selectedDate ? selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie e visualize as tarefas da equipe
          </p>
        </div>
        <Button onClick={handleCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-1">
          <IntegratedCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* Lista de tarefas do dia */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {selectedDate && selectedDateStr === todayStr ? 'Tarefas de Hoje' : 
                 selectedDate ? `Tarefas de ${selectedDateFormatted}` : 'Selecione uma data'}
              </h2>
              {selectedDate && (
                <span className="text-sm text-muted-foreground">
                  {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              )}
            </div>
            
            <AgendaTaskList
              date={selectedDateStr}
              onEditTask={handleEditTask}
            />
          </div>
        </div>
      </div>

      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        selectedDate={selectedDate}
      />

      <EditTaskDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
}
