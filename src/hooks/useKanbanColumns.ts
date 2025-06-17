
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
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchColumns = useCallback(async () => {
    if (fetchingRef.current || !tenantSchema) return;
    
    try {
      fetchingRef.current = true;
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas do esquema do tenant...");
      
      const schema = tenantSchema;
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        if (mountedRef.current) {
          setColumns([]);
        }
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, color, order_position, is_default FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

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

      const columnsData = Array.isArray(data) ? data : [];
      console.log(`✅ useKanbanColumns - ${columnsData.length} colunas carregadas do esquema ${schema}`);
      
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
  }, [tenantSchema, toast]);

  const deleteColumn = useCallback(async (columnId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ useKanbanColumns - Deletando coluna ${columnId} do esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `DELETE FROM ${schema}.kanban_columns WHERE id = '${columnId}'`
      });

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
  }, [tenantSchema, ensureTenantSchema, toast, fetchColumns]);

  const refreshColumns = useCallback(() => {
    console.log("🔄 useKanbanColumns - Refresh manual das colunas solicitado");
    fetchColumns();
  }, [fetchColumns]);

  useEffect(() => {
    if (tenantSchema) {
      console.log("🔄 useKanbanColumns - Tenant schema disponível, carregando colunas...");
      fetchColumns();
    }
  }, [tenantSchema]);

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
