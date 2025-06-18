
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export function useKanbanColumns() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchColumns = useCallback(async () => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas do sistema público...");
      
      // Usar o sistema público padronizado em vez do esquema do tenant
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar colunas do Kanban:', error);
        if (mountedRef.current) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar as colunas do Kanban.",
            variant: "destructive"
          });
          setColumns([]);
        }
        return;
      }

      const columnsData = data || [];
      console.log(`✅ useKanbanColumns - ${columnsData.length} colunas carregadas do sistema público`);
      
      if (mountedRef.current) {
        setColumns(columnsData);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar colunas:', error);
      if (mountedRef.current) {
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado ao carregar as colunas.",
          variant: "destructive"
        });
        setColumns([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [toast]);

  const deleteColumn = useCallback(async (columnId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ useKanbanColumns - Deletando coluna ${columnId} do sistema público...`);
      
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) {
        console.error('❌ Erro ao excluir coluna:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna do Kanban.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useKanbanColumns - Coluna deletada com sucesso');
      toast({
        title: "Sucesso",
        description: "Coluna do Kanban excluída com sucesso.",
      });

      await fetchColumns();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir coluna:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir a coluna.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast, fetchColumns]);

  const refreshColumns = useCallback(() => {
    console.log("🔄 useKanbanColumns - Refresh manual das colunas solicitado");
    fetchColumns();
  }, [fetchColumns]);

  useEffect(() => {
    console.log("🔄 useKanbanColumns - Carregando colunas...");
    fetchColumns();
  }, [fetchColumns]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    columns,
    isLoading,
    refreshColumns,
    deleteColumn
  };
}
