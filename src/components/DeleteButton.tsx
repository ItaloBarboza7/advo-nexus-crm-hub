
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
    console.log('🗑️ Botão de excluir clicado para:', itemName);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    console.log('🔥 [DeleteButton] Confirmando exclusão de:', itemName);
    setIsDeleting(true);
    setShowConfirmDialog(false);
    
    try {
      console.log('📞 [DeleteButton] Chamando função onDelete...');
      await onDelete();
      console.log('✅ [DeleteButton] Função onDelete executada com sucesso');
    } catch (error) {
      console.error('❌ [DeleteButton] Erro na função onDelete:', error);
      // Reabrir o dialog se houve erro
      setShowConfirmDialog(true);
    } finally {
      setIsDeleting(false);
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
