
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export const useKanbanColumnManager = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
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

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT * FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

      if (error) {
        console.error('Error fetching kanban columns:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      if (data && Array.isArray(data)) {
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

  const addColumn = async (column: Omit<KanbanColumn, 'id' | 'order_position'>) => {
    try {
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('Failed to obtain tenant schema');
        return;
      }

      // Determine the next available position
      const nextPosition = columns.length > 0 ? Math.max(...columns.map(c => c.order_position)) + 1 : 1;

      const { error } = await supabase.rpc('exec_sql', {
        sql: `INSERT INTO ${schema}.kanban_columns (name, color, order_position, is_default) VALUES ('${column.name}', '${column.color}', ${nextPosition}, ${column.is_default || false})`
      });

      if (error) {
        console.error('Error adding kanban column:', error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar a coluna do Kanban.",
          variant: "destructive"
        });
        return;
      }

      await loadColumns(); // Reload to get the new column with its ID
      toast({
        title: "Sucesso",
        description: "Coluna do Kanban adicionada com sucesso.",
      });
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

      // Build the SET clause dynamically
      const setParts = [];
      if (updates.name) setParts.push(`name = '${updates.name}'`);
      if (updates.color) setParts.push(`color = '${updates.color}'`);
      if (updates.order_position !== undefined) setParts.push(`order_position = ${updates.order_position}`);
      if (updates.is_default !== undefined) setParts.push(`is_default = ${updates.is_default}`);

      if (setParts.length === 0) return;

      const { error } = await supabase.rpc('exec_sql', {
        sql: `UPDATE ${schema}.kanban_columns SET ${setParts.join(', ')} WHERE id = '${id}'`
      });

      if (error) {
        console.error('Error updating kanban column:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a coluna do Kanban.",
          variant: "destructive"
        });
        return;
      }

      await loadColumns(); // Reload to reflect changes
      toast({
        title: "Sucesso",
        description: "Coluna do Kanban atualizada com sucesso.",
      });
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

      const { error } = await supabase.rpc('exec_sql', {
        sql: `DELETE FROM ${schema}.kanban_columns WHERE id = '${id}'`
      });

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

      // Update positions in the database
      for (const column of newOrder) {
        await supabase.rpc('exec_sql', {
          sql: `UPDATE ${schema}.kanban_columns SET order_position = ${column.order_position} WHERE id = '${column.id}'`
        });
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

  // Dialog management functions
  const handleOpenAddColumnDialog = () => setIsAddColumnDialogOpen(true);
  const handleCloseAddColumnDialog = () => setIsAddColumnDialogOpen(false);
  const handleColumnAdded = () => {
    loadColumns();
    setIsAddColumnDialogOpen(false);
  };

  // Calculate max order for new columns
  const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order_position)) : 0;

  const getTitle = () => "Colunas do Kanban";
  const getDescription = () => "Gerencie as colunas do seu quadro Kanban. Você pode adicionar, editar, reordenar e excluir colunas conforme necessário.";

  return {
    columns,
    isLoading,
    isAddColumnDialogOpen,
    maxOrder,
    loadColumns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded,
    getTitle,
    getDescription
  };
};
