
import { useState, useEffect } from 'react';
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

  const fetchColumns = async () => {
    try {
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas do esquema do tenant...");
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const { data, error } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.kanban_columns ORDER BY order_position ASC`
      });

      if (error) {
        console.error('❌ Erro ao carregar colunas do Kanban:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      const columnsData = Array.isArray(data) ? data : [];
      console.log(`✅ useKanbanColumns - ${columnsData.length} colunas carregadas do esquema ${schema}`);
      setColumns(columnsData);
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar colunas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar as colunas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSchema) {
      fetchColumns();
    }
  }, [tenantSchema]);

  const refreshColumns = () => {
    fetchColumns();
  };

  return {
    columns,
    isLoading,
    refreshColumns
  };
}
