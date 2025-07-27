
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useNewOptionHandler() {
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");
  const { toast } = useToast();

  const handleAddNewOption = useCallback(async (
    field: string,
    onSuccess: (value: string) => void,
    refreshData: () => void,
    addLossReason?: (reason: string) => Promise<boolean>,
    actionGroups?: Array<{ id: string; name: string }>
  ) => {
    if (!newOptionValue.trim()) return;

    try {
      let success = false;

      if (field === 'source') {
        const { error } = await supabase
          .from('lead_sources')
          .insert([{
            name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
            label: newOptionValue.trim()
          }]);

        if (!error) {
          success = true;
          await refreshData();
          onSuccess(newOptionValue.toLowerCase().replace(/\s+/g, '-'));
        }
      } else if (field === 'action_group') {
        const { error } = await supabase
          .from('action_groups')
          .insert([{
            name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
            description: newOptionValue.trim()
          }]);

        if (!error) {
          success = true;
          await refreshData();
          onSuccess(newOptionValue.toLowerCase().replace(/\s+/g, '-'));
        }
      } else if (field === 'action_type' && actionGroups) {
        const actionGroup = actionGroups.find(group => group.name === newOptionValue);
        if (actionGroup) {
          const { error } = await supabase
            .from('action_types')
            .insert([{
              name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
              action_group_id: actionGroup.id
            }]);

          if (!error) {
            success = true;
            await refreshData();
            onSuccess(newOptionValue.toLowerCase().replace(/\s+/g, '-'));
          }
        }
      } else if (field === 'loss_reason' && addLossReason) {
        success = await addLossReason(newOptionValue.trim());
        if (success) {
          onSuccess(newOptionValue.trim());
        }
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: `Nova opção adicionada com sucesso.`,
        });
        setNewOptionValue("");
        setShowNewOptionInput(null);
      }
    } catch (error) {
      console.error('Erro ao adicionar nova opção:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  }, [newOptionValue, toast]);

  const closeNewOptionInput = useCallback(() => {
    setShowNewOptionInput(null);
    setNewOptionValue("");
  }, []);

  return {
    showNewOptionInput,
    setShowNewOptionInput,
    newOptionValue,
    setNewOptionValue,
    handleAddNewOption,
    closeNewOptionInput
  };
}
