
import { supabase } from "@/integrations/supabase/client";
import { normalizeText, textToSlug } from "./textNormalization";

export async function checkAndUnhideDefaultSource(sourceName: string): Promise<{ shouldCreate: boolean; sourceId?: string }> {
  try {
    const normalizedInput = normalizeText(sourceName);
    const slugInput = textToSlug(sourceName);
    
    // Check if there's a default source with this name (try both normalized and slug versions)
    const { data: defaultSources, error: defaultError } = await supabase
      .from('lead_sources')
      .select('id, name, label')
      .is('user_id', null);

    if (defaultError) {
      console.error('Error checking default sources:', defaultError);
      return { shouldCreate: true };
    }

    if (defaultSources && defaultSources.length > 0) {
      // Find matching source by comparing normalized names
      const matchingSource = defaultSources.find(source => {
        const normalizedDbName = normalizeText(source.name);
        const normalizedDbLabel = normalizeText(source.label);
        return normalizedDbName === normalizedInput || 
               normalizedDbLabel === normalizedInput ||
               source.name === slugInput;
      });

      if (matchingSource) {
        // Check if this default source is hidden for current tenant
        const { data: hiddenItems, error: hiddenError } = await supabase
          .from('hidden_default_items')
          .select('id')
          .eq('item_id', matchingSource.id)
          .eq('item_type', 'lead_source');

        if (hiddenError) {
          console.error('Error checking hidden items:', hiddenError);
          return { shouldCreate: true };
        }

        if (hiddenItems && hiddenItems.length > 0) {
          // This default source is hidden, so unhide it
          const { error: unhideError } = await supabase
            .from('hidden_default_items')
            .delete()
            .eq('item_id', matchingSource.id)
            .eq('item_type', 'lead_source');

          if (unhideError) {
            console.error('Error unhiding default source:', unhideError);
            return { shouldCreate: true };
          }

          console.log('✅ Default source unhidden successfully:', matchingSource.label);
          return { shouldCreate: false, sourceId: matchingSource.id };
        }
      }
    }

    return { shouldCreate: true };
  } catch (error) {
    console.error('Unexpected error in checkAndUnhideDefaultSource:', error);
    return { shouldCreate: true };
  }
}
