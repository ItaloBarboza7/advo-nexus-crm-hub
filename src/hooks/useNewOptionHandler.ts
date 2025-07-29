
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAndUnhideDefaultSource } from "@/utils/leadSourceUtils";
import { checkAndUnhideDefaultLossReason } from "@/utils/lossReasonUtils";

export function useNewOptionHandler() {
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");

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
        const sourceName = newOptionValue.toLowerCase().replace(/\s+/g, '-');
        
        // Check if we should unhide a default source instead of creating a new one
        const { shouldCreate, sourceId } = await checkAndUnhideDefaultSource(newOptionValue);
        
        if (!shouldCreate) {
          // Source was unhidden successfully - no message needed
          success = true;
          await refreshData();
          onSuccess(sourceName);
        } else {
          // Create a new source
          const { error } = await supabase
            .from('lead_sources')
            .insert([{
              name: sourceName,
              label: newOptionValue.trim()
            }]);

          if (!error) {
            success = true;
            await refreshData();
            onSuccess(sourceName);
          }
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
      } else if (field === 'loss_reason') {
        // Check if we should unhide a default loss reason instead of creating a new one
        const { shouldCreate, reasonId } = await checkAndUnhideDefaultLossReason(newOptionValue);
        
        if (!shouldCreate) {
          // Reason was unhidden successfully - no message needed
          success = true;
          await refreshData();
          onSuccess(newOptionValue.trim());
        } else if (addLossReason) {
          // Create a new reason
          success = await addLossReason(newOptionValue.trim());
          if (success) {
            onSuccess(newOptionValue.trim());
          }
        }
      }

      if (success) {
        setNewOptionValue("");
        setShowNewOptionInput(null);
      }
    } catch (error) {
      console.error('Erro ao adicionar nova opção:', error);
    }
  }, [newOptionValue]);

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
