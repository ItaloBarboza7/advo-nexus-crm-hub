
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Clock, 
  User,
  CheckCircle2,
  Circle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgendaTask } from "@/types/agenda";
import { cn } from "@/lib/utils";

interface AgendaTaskItemProps {
  task: AgendaTask;
  onEdit: () => void;
  onUpdateStatus: (status: 'pending' | 'completed' | 'cancelled') => void;
  onDelete: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: Circle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconClassName: 'text-yellow-600'
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconClassName: 'text-green-600'
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconClassName: 'text-red-600'
  }
};

export function AgendaTaskItem({ task, onEdit, onUpdateStatus, onDelete }: AgendaTaskItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  const toggleStatus = () => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    onUpdateStatus(newStatus);
  };

  return (
    <Card className={cn(
      "p-4 transition-all hover:shadow-md",
      task.status === 'completed' && "opacity-75"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Status Icon - Clickable */}
          <button
            onClick={toggleStatus}
            className={cn(
              "mt-1 p-1 rounded-full hover:bg-accent transition-colors",
              config.iconClassName
            )}
          >
            <StatusIcon className="h-4 w-4" />
          </button>

          <div className="flex-1 space-y-2">
            {/* Title */}
            <h4 className={cn(
              "font-medium text-foreground",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h4>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-muted-foreground">
                {task.description}
              </p>
            )}

            {/* Time and Assigned User */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.scheduled_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.scheduled_time.slice(0, 5)}
                </div>
              )}

              {task.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.assigned_to.name}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge and Menu */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>

          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('completed')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como concluída
                </DropdownMenuItem>
              )}
              
              {task.status === 'completed' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('pending')}>
                  <Circle className="h-4 w-4 mr-2" />
                  Marcar como pendente
                </DropdownMenuItem>
              )}
              
              {task.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onUpdateStatus('cancelled')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar tarefa
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
