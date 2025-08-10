
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgendaTask, CreateAgendaTaskRequest, updateAgendaTaskRequest } from "@/types/agenda";
import { useToast } from "@/hooks/use-toast";

export function useAgendaTasks(date?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['agenda-tasks', date],
    queryFn: async () => {
      let query = supabase
        .from('agenda_tasks')
        .select(`
          *,
          assigned_to:user_profiles!agenda_tasks_assigned_to_user_id_fkey(name, email),
          created_by:user_profiles!agenda_tasks_created_by_user_id_fkey(name, email)
        `)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (date) {
        query = query.eq('scheduled_date', date);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching agenda tasks:', error);
        throw error;
      }
      
      return (data || []).map(task => ({
        ...task,
        assigned_to: task.assigned_to || { name: 'Unknown User' },
        created_by: task.created_by || { name: 'Unknown User' }
      })) as AgendaTask[];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateAgendaTaskRequest) => {
      const { data, error } = await supabase
        .from('agenda_tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-tasks'] });
      toast({
        title: "Tarefa criada com sucesso!",
        description: "A nova tarefa foi adicionada à agenda.",
      });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: "Erro ao criar tarefa",
        description: "Ocorreu um erro ao criar a tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAgendaTaskRequest & { id: string }) => {
      const { data, error } = await supabase
        .from('agenda_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-tasks'] });
      toast({
        title: "Tarefa atualizada!",
        description: "A tarefa foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({
        title: "Erro ao atualizar tarefa",
        description: "Ocorreu um erro ao atualizar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-tasks'] });
      toast({
        title: "Tarefa removida!",
        description: "A tarefa foi removida da agenda.",
      });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro ao remover tarefa",
        description: "Ocorreu um erro ao remover a tarefa.",
        variant: "destructive",
      });
    },
  });

  return {
    tasks,
    isLoading,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
