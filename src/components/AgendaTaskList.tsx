
import { useAgendaTasks } from "@/hooks/useAgendaTasks";
import { AgendaTaskItem } from "@/components/AgendaTaskItem";
import { AgendaTask } from "@/types/agenda";

interface AgendaTaskListProps {
  date: string;
  onEditTask: (task: AgendaTask) => void;
}

export function AgendaTaskList({ date, onEditTask }: AgendaTaskListProps) {
  const { tasks, isLoading, updateTask, deleteTask } = useAgendaTasks(date);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma tarefa para este dia
        </h3>
        <p className="text-muted-foreground">
          Clique em "Nova Tarefa" para adicionar uma tarefa para este dia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <AgendaTaskItem
          key={task.id}
          task={task}
          onEdit={() => onEditTask(task)}
          onUpdateStatus={(status) => updateTask({ id: task.id, status })}
          onDelete={() => deleteTask(task.id)}
        />
      ))}
    </div>
  );
}
