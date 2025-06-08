
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export function useKanbanColumns() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchColumns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao carregar colunas do Kanban:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      setColumns(data || []);
    } catch (error) {
      console.error('Erro inesperado ao carregar colunas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('Erro ao excluir coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso.",
      });

      await fetchColumns(); // Refresh the list
    } catch (error) {
      console.error('Erro inesperado ao excluir coluna:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  const refreshColumns = () => {
    fetchColumns();
  };

  return {
    columns,
    isLoading,
    refreshColumns,
    deleteColumn
  };
}
