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

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: string;
  onConfirm: () => void;
  description?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm,
  description
}: ConfirmDeleteDialogProps) {
  console.log(`🔍 ConfirmDeleteDialog - Renderizado: open=${open}, item="${itemName}", tipo="${itemType}"`);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`✅ ConfirmDeleteDialog - Usuário confirmou a exclusão de: ${itemName} (${itemType})`);
    console.log(`🔄 ConfirmDeleteDialog - Chamando onConfirm...`);
    
    // Chamar a função de confirmação
    await onConfirm();
    
    console.log(`✅ ConfirmDeleteDialog - onConfirm executado. Fechando diálogo...`);
    
    // Fechar o diálogo após a confirmação
    onOpenChange(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`❌ ConfirmDeleteDialog - Usuário cancelou a exclusão de: ${itemName} (${itemType})`);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log(`🔄 ConfirmDeleteDialog - onOpenChange chamado: ${newOpen} para item: ${itemName}`);
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="z-[60]">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {itemType} "{itemName}"? 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          {description && (
            <div className="mt-2 text-xs text-gray-700">{description}</div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
