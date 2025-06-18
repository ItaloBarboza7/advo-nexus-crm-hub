
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const lastFetchTimeRef = useRef(0);

  // Debounce mechanism to prevent rapid successive calls
  const FETCH_DEBOUNCE_MS = 1000;

  const fetchColumns = useCallback(async () => {
    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      console.log("🚫 useKanbanColumns - Fetch skipped (debounce or already fetching)");
      return;
    }
    
    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas SOMENTE do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        if (mountedRef.current) {
          setColumns([]);
        }
        return;
      }

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, color, order_position, is_default FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

      if (error) {
        console.error('❌ Erro ao carregar colunas do Kanban do tenant:', error);
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
      console.log(`✅ useKanbanColumns - ${columnsData.length} colunas carregadas EXCLUSIVAMENTE do esquema ${schema}`);
      
      if (mountedRef.current) {
        setColumns(prev => {
          // Only update if data has actually changed
          if (JSON.stringify(prev) !== JSON.stringify(columnsData)) {
            return columnsData;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar colunas do tenant:', error);
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
  }, [tenantSchema, ensureTenantSchema, toast]);

  const deleteColumn = useCallback(async (columnId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ useKanbanColumns - Deletando coluna ${columnId} SOMENTE do esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // SEMPRE usar o esquema do tenant - nunca a tabela global
      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: `DELETE FROM ${schema}.kanban_columns WHERE id = '${columnId}'`
      });

      if (error) {
        console.error('❌ Erro ao excluir coluna do tenant:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a coluna do Kanban.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useKanbanColumns - Coluna deletada com sucesso do esquema do tenant');
      toast({
        title: "Sucesso",
        description: "Coluna do Kanban excluída com sucesso.",
      });

      await fetchColumns();
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao excluir coluna do tenant:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir a coluna.",
        variant: "destructive"
      });
      return false;
    }
  }, [tenantSchema, ensureTenantSchema, toast, fetchColumns]);

  // Memoize the refresh function to prevent recreation
  const refreshColumns = useMemo(() => {
    return () => {
      console.log("🔄 useKanbanColumns - Refresh manual das colunas do tenant solicitado");
      fetchColumns();
    };
  }, [fetchColumns]);

  useEffect(() => {
    if (tenantSchema && !fetchingRef.current) {
      console.log("🔄 useKanbanColumns - Tenant schema disponível, carregando colunas do tenant...");
      fetchColumns();
    }
  }, [tenantSchema, fetchColumns]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Memoize the return object to prevent recreation
  return useMemo(() => ({
    columns,
    isLoading,
    refreshColumns,
    deleteColumn
  }), [columns, isLoading, refreshColumns, deleteColumn]);
}
