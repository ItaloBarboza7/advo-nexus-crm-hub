
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

  const handleColumnAdded = useCallback((columnData: { name: string; color: string; order: number }) => {
    console.log("✅ useKanbanColumnManager - Coluna adicionada ao tenant, atualizando lista:", columnData.name);
    refreshColumns();
    setIsAddColumnDialogOpen(false);
  }, [refreshColumns]);

  return useMemo(() => ({
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  }), [
    isAddColumnDialogOpen,
    maxOrder,
    handleOpenAddColumnDialog,
    handleCloseAddColumnDialog,
    handleColumnAdded
  ]);
}
