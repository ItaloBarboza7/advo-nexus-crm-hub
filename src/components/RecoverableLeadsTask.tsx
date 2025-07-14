
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Clock, DollarSign, RefreshCw, AlertCircle, CheckCircle2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { useToast } from "@/hooks/use-toast";

interface RecoverableLeadsTaskProps {
  userName: string;
}

export function RecoverableLeadsTask({ userName }: RecoverableLeadsTaskProps) {
  const [recoverableLeads, setRecoverableLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLeads, setCompletedLeads] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Motivos de perda que podem ser revertidos
  const recoverableReasons = [
    'Não tinha dinheiro',
    'Não tinha dinheiro no momento',
    'Falta de recursos financeiros',
    'Orçamento limitado',
    'Precisa de mais tempo para decidir',
    'Vai pensar',
    'Vai decidir depois',
    'Não é o momento',
    'Timing não é ideal'
  ];

  const fetchRecoverableLeads = async () => {
    try {
      setIsLoading(true);
      
      // Buscar leads perdidos nos últimos 30 dias com motivos recuperáveis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'Perdido')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads recuperáveis:', error);
        return;
      }

      // Filtrar leads com motivos recuperáveis
      const filteredLeads = (data || []).filter(lead => {
        const lossReason = lead.loss_reason?.toLowerCase() || '';
        return recoverableReasons.some(reason => 
          lossReason.includes(reason.toLowerCase())
        );
      });

      setRecoverableLeads(filteredLeads);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads recuperáveis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = (leadId: string) => {
    setCompletedLeads(prev => new Set([...prev, leadId]));
    toast({
      title: "Tarefa concluída",
      description: "Lead marcado como concluído.",
    });
  };

  const getDaysSinceLoss = (updatedAt: string) => {
    const lossDate = new Date(updatedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lossDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriorityLevel = (daysSince: number, value: number | null) => {
    if (daysSince <= 7) return 'high';
    if (daysSince <= 14 || (value && value > 10000)) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Urgente';
      case 'medium': return 'Moderada';
      case 'low': return 'Baixa';
      default: return 'Normal';
    }
  };

  useEffect(() => {
    fetchRecoverableLeads();
  }, []);

  // Filtrar leads que não foram marcados como concluídos
  const visibleLeads = recoverableLeads.filter(lead => !completedLeads.has(lead.id));

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando leads recuperáveis...</p>
        </div>
      </Card>
    );
  }

  if (visibleLeads.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Follow UP</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Não há leads perdidos recentes que possam ser recuperados</p>
          <p className="text-sm mt-1">Continue o excelente trabalho!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Follow UP</h3>
        </div>
        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
          {visibleLeads.length} leads
        </Badge>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <p className="text-blue-800 text-sm font-medium">
          Leads com potencial de recuperação - Entre em contato novamente
        </p>
      </div>

      <div className="space-y-3">
        {visibleLeads.map((lead) => {
          const daysSince = getDaysSinceLoss(lead.updated_at);
          const priority = getPriorityLevel(daysSince, lead.value);

          return (
            <div key={lead.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900 text-lg">{lead.name}</span>
                    <Badge className={`${getPriorityColor(priority)} text-xs font-medium border`}>
                      {getPriorityLabel(priority)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm">há {daysSince} dias</span>
                    </div>
                    {lead.value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-sm font-medium">R$ {lead.value.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Motivo:</span> {lead.loss_reason}
                  </div>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleCompleteTask(lead.id)}
                  className="bg-green-600 hover:bg-green-700 ml-4"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluído
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span className="font-medium">Total de oportunidades: {visibleLeads.length}</span>
          <span className="font-medium">Valor potencial: R$ {visibleLeads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </Card>
  );
}
