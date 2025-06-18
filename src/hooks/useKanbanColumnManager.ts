
import { useState, useCallback, useMemo } from 'react';
import { useKanbanColumns } from '@/hooks/useKanbanColumns';

export function useKanbanColumnManager() {
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const { columns, refreshColumns } = useKanbanColumns();

  const maxOrder = useMemo(() => {
    return columns.length > 0 ? Math.max(...columns.map(col => col.order_position)) : 0;
  }, [columns]);

  const handleOpenAddColumnDialog = useCallback(() => {
    console.log("🔧 useKanbanColumnManager - Abrindo diálogo para adicionar coluna ao tenant");
    setIsAddColumnDialogOpen(true);
  }, []);

  const handleCloseAddColumnDialog = useCallback(() => {
    console.log("❌ useKanbanColumnManager - Fechando diálogo de adicionar coluna");
    setIsAddColumnDialogOpen(false);
  }, []);

  const handleColumnAdded = useCallback(() => {
    console.log("✅ useKanbanColumnManager - Coluna adicionada ao tenant, atualizando lista");
    refreshColumns();
    setIsAddColumnDialogOpen(false);
  }, [refreshColumns]);

  return useMemo(() => ({
    columns,
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  }), [
    columns,
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  ]);
}
