
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
}

export function useKanbanColumns() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const fetchColumns = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        setColumns([]);
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT id, name, color, order_position, is_default FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

      if (error) {
        console.error('❌ Erro ao carregar colunas do Kanban:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        setColumns([]);
        return;
      }

      const columnsData = Array.isArray(data) ? data : [];
      console.log(`✅ useKanbanColumns - ${columnsData.length} colunas carregadas do esquema ${schema}:`, columnsData.map(c => c.name));
      
      // Sempre atualizar o estado, mesmo se os dados parecem iguais
      setColumns([...columnsData]);
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar colunas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas.",
        variant: "destructive"
      });
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast]);

  const deleteColumn = async (columnId: string): Promise<boolean> => {
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

      // Atualizar a lista de colunas após deletar
      await fetchColumns(true);
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
  };

  // Carregar colunas quando o tenant schema estiver disponível
  useEffect(() => {
    if (tenantSchema) {
      console.log("🔄 useKanbanColumns - Tenant schema disponível, carregando colunas...");
      fetchColumns();
    }
  }, [tenantSchema, fetchColumns]);

  const refreshColumns = useCallback(async () => {
    console.log("🔄 useKanbanColumns - Refresh manual das colunas solicitado");
    await fetchColumns(true);
  }, [fetchColumns]);

  return {
    columns,
    isLoading,
    refreshColumns,
    deleteColumn
  };
}
