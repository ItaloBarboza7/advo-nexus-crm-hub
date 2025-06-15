
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

  // Abrir dialogo de confirmação
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isDeleting) return;
    setShowConfirmDialog(true);
  };

  // Handler para confirmar exclusão
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowConfirmDialog(false);
    } catch (error) {
      setShowConfirmDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler para fechar/cancelar dialogo SEM travar botão
  const handleDialogClose = () => {
    // Ao cancelar, sempre garantir que não fique travado
    setIsDeleting(false);
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
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setShowConfirmDialog(true);
        }}
        itemName={itemName}
        itemType={itemType}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
