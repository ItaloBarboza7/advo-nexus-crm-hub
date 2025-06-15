
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
  variant = "outline"
}: DeleteButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`🗑️ DeleteButton - Botão de excluir clicado para: ${itemName} (${itemType})`);
    setShowConfirmDialog(true);
    console.log('✅ DeleteButton - Dialog de confirmação aberto');
  };

  const handleConfirmDelete = async () => {
    console.log(`🔥 DeleteButton - Confirmando exclusão de: ${itemName} (${itemType})`);
    try {
      setIsDeleting(true);
      await onDelete();
      console.log(`✅ DeleteButton - Item ${itemName} excluído com sucesso`);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error(`❌ DeleteButton - Erro ao excluir ${itemName}:`, error);
      setShowConfirmDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDialogClose = () => {
    console.log(`❌ DeleteButton - Dialog de confirmação cancelado para: ${itemName}`);
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
