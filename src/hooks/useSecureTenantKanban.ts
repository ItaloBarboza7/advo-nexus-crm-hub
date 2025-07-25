
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export function useSecureTenantKanban() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchColumns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("📊 useSecureTenantKanban - Fetching kanban columns using secure function...");
      
      const { data, error } = await supabase.rpc('get_tenant_kanban_columns');
      
      if (error) {
        console.error('❌ Error fetching kanban columns:', error);
        setError(error.message);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do kanban.",
          variant: "destructive"
        });
        return;
      }

      console.log(`✅ useSecureTenantKanban - ${data?.length || 0} columns loaded securely`);
      setColumns(data || []);
    } catch (error: any) {
      console.error('❌ Unexpected error fetching kanban columns:', error);
      setError(error.message || 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas do kanban.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  return {
    columns,
    isLoading,
    error,
    fetchColumns
  };
}
