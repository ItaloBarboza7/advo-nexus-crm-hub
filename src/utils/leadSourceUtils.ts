
import { supabase } from "@/integrations/supabase/client";

export async function checkAndUnhideDefaultSource(sourceName: string): Promise<{ shouldCreate: boolean; sourceId?: string }> {
  try {
    // Check if there's a default source with this name that's hidden
    const { data: defaultSources, error: defaultError } = await supabase
      .from('lead_sources')
      .select('id, name, label')
      .eq('name', sourceName.toLowerCase().replace(/\s+/g, '-'))
      .is('user_id', null);

    if (defaultError) {
      console.error('Error checking default sources:', defaultError);
      return { shouldCreate: true };
    }

    if (defaultSources && defaultSources.length > 0) {
      const defaultSource = defaultSources[0];
      
      // Check if this default source is hidden for current tenant
      const { data: hiddenItems, error: hiddenError } = await supabase
        .from('hidden_default_items')
        .select('id')
        .eq('item_id', defaultSource.id)
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
          .eq('item_id', defaultSource.id)
          .eq('item_type', 'lead_source');

        if (unhideError) {
          console.error('Error unhiding default source:', unhideError);
          return { shouldCreate: true };
        }

        console.log('✅ Default source unhidden successfully:', defaultSource.label);
        return { shouldCreate: false, sourceId: defaultSource.id };
      }
    }

    return { shouldCreate: true };
  } catch (error) {
    console.error('Unexpected error in checkAndUnhideDefaultSource:', error);
    return { shouldCreate: true };
  }
}
