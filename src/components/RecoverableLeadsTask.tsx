import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Clock, DollarSign, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RecoverableLeadsTaskProps {
  userName: string;
}

export function RecoverableLeadsTask({ userName }: RecoverableLeadsTaskProps) {
  const [recoverableLeads, setRecoverableLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
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
        <div className="text-center py-4">
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
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Não há leads perdidos recentes que possam ser recuperados</p>
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
        <Badge variant="outline" className="text-green-700 border-green-300">
          {visibleLeads.length} leads
        </Badge>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <p className="text-blue-800 text-sm">
          Estes leads foram perdidos por motivos que podem ser revertidos.
          Entre em contato novamente para tentar recuperar essas oportunidades.
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {visibleLeads.map((lead) => {
          const daysSince = getDaysSinceLoss(lead.updated_at);
          const priority = getPriorityLevel(daysSince, lead.value);
          const isExpanded = expandedLead === lead.id;

          return (
            <div key={lead.id} className="bg-gray-50 rounded p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{lead.name}</span>
                    <Badge className={`${getPriorityColor(priority)} text-xs`}>
                      {getPriorityLabel(priority)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Perdido há {daysSince} dias</span>
                    </div>
                    {lead.value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>R$ {lead.value.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Motivo:</span> {lead.loss_reason}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                  >
                    {isExpanded ? 'Menos' : 'Detalhes'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCompleteTask(lead.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluído
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Informações de Contato:</h5>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Telefone:</span> {lead.phone}
                        </div>
                        {lead.email && (
                          <div>
                            <span className="font-medium">Email:</span> {lead.email}
                          </div>
                        )}
                        {lead.state && (
                          <div>
                            <span className="font-medium">Estado:</span> {lead.state}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Detalhes:</h5>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Fonte:</span> {lead.source || 'Não informado'}
                        </div>
                        <div>
                          <span className="font-medium">Data da perda:</span> {format(new Date(lead.updated_at), 'dd/MM/yyyy')}
                        </div>
                        {lead.description && (
                          <div>
                            <span className="font-medium">Descrição:</span> {lead.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total de oportunidades de recuperação: {visibleLeads.length}</span>
          <span>Valor potencial: R$ {visibleLeads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </Card>
  );
}
