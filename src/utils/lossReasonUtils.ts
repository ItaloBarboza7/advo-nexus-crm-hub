
import { supabase } from "@/integrations/supabase/client";
import { normalizeText } from "./textNormalization";

export async function checkAndUnhideDefaultLossReason(reasonName: string): Promise<{ shouldCreate: boolean; reasonId?: string }> {
  try {
    const normalizedInput = normalizeText(reasonName);
    
    // Check if there's a default loss reason with this name
    const { data: defaultReasons, error: defaultError } = await supabase
      .from('loss_reasons')
      .select('id, reason, is_fixed')
      .is('user_id', null);

    if (defaultError) {
      console.error('Error checking default loss reasons:', defaultError);
      return { shouldCreate: true };
    }

    if (defaultReasons && defaultReasons.length > 0) {
      // Find matching reason by comparing normalized names
      const matchingReason = defaultReasons.find(reason => {
        const normalizedDbReason = normalizeText(reason.reason);
        return normalizedDbReason === normalizedInput;
      });

      if (matchingReason) {
        // Check if this default reason is hidden for current tenant
        const { data: hiddenItems, error: hiddenError } = await supabase
          .from('hidden_default_items')
          .select('id')
          .eq('item_id', matchingReason.id)
          .eq('item_type', 'loss_reason');

        if (hiddenError) {
          console.error('Error checking hidden items:', hiddenError);
          return { shouldCreate: true };
        }

        if (hiddenItems && hiddenItems.length > 0) {
          // This default reason is hidden, so unhide it
          const { error: unhideError } = await supabase
            .from('hidden_default_items')
            .delete()
            .eq('item_id', matchingReason.id)
            .eq('item_type', 'loss_reason');

          if (unhideError) {
            console.error('Error unhiding default loss reason:', unhideError);
            return { shouldCreate: true };
          }

          console.log('✅ Default loss reason unhidden successfully:', matchingReason.reason);
          return { shouldCreate: false, reasonId: matchingReason.id };
        }
      }
    }

    return { shouldCreate: true };
  } catch (error) {
    console.error('Unexpected error in checkAndUnhideDefaultLossReason:', error);
    return { shouldCreate: true };
  }
}
