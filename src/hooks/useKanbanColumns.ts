
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // O RLS agora gerencia o isolamento automaticamente - sem filtros manuais!
  const fetchColumns = async () => {
    try {
      setIsLoading(true);
      console.log("🏗️ useKanbanColumns - Carregando colunas (RLS automático)...");
      
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar colunas do Kanban:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as colunas do Kanban.",
          variant: "destructive"
        });
        return;
      }

      console.log(`✅ useKanbanColumns - ${(data || []).length} colunas carregadas (isolamento automático por RLS)`);
      setColumns(data || []);
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
    fetchColumns();
  }, []);

  const refreshColumns = () => {
    fetchColumns();
  };

  return {
    columns,
    isLoading,
    refreshColumns
  };
}
