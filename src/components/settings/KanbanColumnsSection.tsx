
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

export function KanbanColumnsSection() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar colunas do Kanban:', error);
        return;
      }

      setColumns(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar colunas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Colunas do Kanban</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colunas do Kanban</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {columns.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma coluna encontrada.</p>
          ) : (
            columns.map((column) => (
              <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: column.color }}
                  ></div>
                  <span className="text-sm">{column.name}</span>
                  {column.is_default && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Padrão
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">Posição: {column.order_position}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
