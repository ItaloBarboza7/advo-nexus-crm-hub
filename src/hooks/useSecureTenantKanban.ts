
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSecureTenantKanban() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

  const fetchColumns = useCallback(async () => {
    if (!tenantSchema) {
      console.log("🚫 useSecureTenantKanban - No tenant schema available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("📊 useSecureTenantKanban - Fetching kanban columns from tenant schema:", tenantSchema);
      
      const { data, error } = await supabase
        .from(`${tenantSchema}.kanban_columns`)
        .select('*')
        .order('order_position', { ascending: true });
      
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

      const columnsData = (data || []).map(col => ({
        ...col,
        order_position: col.order_position
      }));

      console.log(`✅ useSecureTenantKanban - ${columnsData.length} columns loaded securely`);
      setColumns(columnsData);
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
  }, [toast, tenantSchema]);

  useEffect(() => {
    if (tenantSchema) {
      fetchColumns();
    }
  }, [fetchColumns, tenantSchema]);

  return {
    columns,
    isLoading,
    error,
    fetchColumns
  };
}
