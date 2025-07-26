import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  position: number;
}

export const useKanbanColumnManager = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const { toast } = useToast();

  const loadColumns = async () => {
    setIsLoading(true);
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position', { ascending: true })
        .schema(schema);

      if (error) {
        console.error('Error fetching kanban columns:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setColumns(data);
      }
    } catch (error) {
      console.error('Unexpected error loading kanban columns:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas do Kanban.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadColumns();
  }, [tenantSchema]);

  const addColumn = async (column: Omit<KanbanColumn, 'id' | 'position'>) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      // Determine the next available position
      const nextPosition = columns.length > 0 ? Math.max(...columns.map(c => c.position)) + 1 : 1;

      const { data, error } = await supabase
        .from('kanban_columns')
        .insert([{ ...column, position: nextPosition }])
        .schema(schema)
        .select();

      if (error) {
        console.error('Error adding kanban column:', error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar a coluna do Kanban.",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        setColumns([...columns, { ...data[0] }]);
        toast({
          title: "Sucesso",
          description: "Coluna do Kanban adicionada com sucesso.",
        });
      } else {
        console.warn('No data returned after insert operation.');
      }
    } catch (error) {
      console.error('Unexpected error adding kanban column:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao adicionar a coluna do Kanban.",
        variant: "destructive"
      });
    }
  };

  const updateColumn = async (id: string, updates: Partial<KanbanColumn>) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      const { data, error } = await supabase
        .from('kanban_columns')
        .update(updates)
        .eq('id', id)
        .schema(schema)
        .select();

      if (error) {
        console.error('Error updating kanban column:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a coluna do Kanban.",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        setColumns(columns.map(column => column.id === id ? { ...column, ...data[0] } : column));
        toast({
          title: "Sucesso",
          description: "Coluna do Kanban atualizada com sucesso.",
        });
      } else {
        console.warn('No data returned after update operation.');
      }
    } catch (error) {
      console.error('Unexpected error updating kanban column:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar a coluna do Kanban.",
        variant: "destructive"
      });
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', id)
        .schema(schema);

      if (error) {
        console.error('Error deleting kanban column:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna do Kanban.",
          variant: "destructive"
        });
        return;
      }

      setColumns(columns.filter(column => column.id !== id));
      toast({
        title: "Sucesso",
        description: "Coluna do Kanban excluída com sucesso.",
      });
    } catch (error) {
      console.error('Unexpected error deleting kanban column:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir a coluna do Kanban.",
        variant: "destructive"
      });
    }
  };

  const reorderColumns = async (newOrder: KanbanColumn[]) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      // Use a batch operation to update all column positions
      const updates = newOrder.map(column => ({
        id: column.id,
        position: column.position,
      }));

      // Create an array to hold the update promises
      const updatePromises = updates.map(update =>
        supabase
          .from('kanban_columns')
          .update({ position: update.position })
          .eq('id', update.id)
          .schema(schema)
      );

      // Execute all updates in parallel
      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Error reordering kanban columns:', errors);
        toast({
          title: "Erro",
          description: "Não foi possível reordenar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      // Optimistically update the local state
      setColumns(newOrder);
      toast({
        title: "Sucesso",
        description: "Colunas do Kanban reordenadas com sucesso.",
      });
    } catch (error) {
      console.error('Unexpected error reordering kanban columns:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao reordenar as colunas do Kanban.",
        variant: "destructive"
      });
    }
  };

  const getTitle = () => "Colunas do Kanban";

  const getDescription = () => "Gerencie as colunas do seu quadro Kanban. Você pode adicionar, editar, reordenar e excluir colunas conforme necessário.";

  return {
    columns,
    isLoading,
    loadColumns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    getTitle,
    getDescription
  };
};
