
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface DeleteButtonProps {
  onDelete: () => Promise<void>;
  itemName: string;
  itemType: string;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function DeleteButton({ 
  onDelete, 
  itemName, 
  itemType, 
  disabled = false, 
  size = "sm",
  variant = "ghost"
}: DeleteButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🗑️ Novo botão de excluir clicado para:', itemName);
    setShowConfirmDialog(true);
    console.log('✅ Dialog de confirmação aberto');
  };

  const handleConfirmDelete = async () => {
    console.log('🔥 Confirmando exclusão de:', itemName);
    try {
      setIsDeleting(true);
      await onDelete();
      console.log('✅ Item excluído com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir item:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleDialogClose = () => {
    console.log('❌ Dialog de confirmação cancelado');
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleDeleteClick}
        disabled={disabled || isDeleting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <ConfirmDeleteDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        itemName={itemName}
        itemType={itemType}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
