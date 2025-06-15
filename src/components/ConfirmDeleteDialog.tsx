
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React from "react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: string;
  onConfirm: () => void;
  description?: string;
  isDefault?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm,
  description,
  isDefault
}: ConfirmDeleteDialogProps) {

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  const title = isDefault ? "Ocultar Item Padrão" : "Confirmar Exclusão";
  const confirmText = isDefault ? "Ocultar" : "Excluir";
  const dialogDescription = isDefault 
    ? `Deseja ocultar ${itemType} "${itemName}"? Itens padrão serão apenas escondidos da sua lista, não excluídos permanentemente.`
    : `Tem certeza que deseja excluir ${itemType} "${itemName}"? Esta ação não pode ser desfeita.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[60]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription}
          </AlertDialogDescription>
          {description && (
            <div className="mt-2 text-sm text-gray-700">{description}</div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={!isDefault ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
