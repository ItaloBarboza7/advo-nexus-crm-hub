
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface DeleteButtonProps {
  onDelete: () => Promise<void>;
  itemName: string;
  itemType: string;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  isDefault?: boolean;
}

export function DeleteButton({ 
  onDelete, 
  itemName, 
  itemType, 
  disabled = false, 
  size = "sm",
  variant = "outline",
  isDefault = false
}: DeleteButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error(`❌ DeleteButton - Erro ao processar ${itemName}:`, error);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
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
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>

      <ConfirmDeleteDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        itemName={itemName}
        itemType={itemType}
        onConfirm={handleConfirmDelete}
        isDefault={isDefault}
      />
    </>
  );
}
