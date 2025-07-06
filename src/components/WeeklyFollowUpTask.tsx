
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { BrazilTimezone } from "@/lib/timezone";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  updated_at: string;
}

interface WeeklyFollowUpTaskProps {
  userName: string;
}

export function WeeklyFollowUpTask({ userName }: WeeklyFollowUpTaskProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
        });
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchFollowUpLeads = async () => {
      if (!tenantSchema || !currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("🔍 WeeklyFollowUpTask - Buscando leads para follow up...");
        
        // Calcular data de uma semana atrás para leads finalizados/perdidos
        const oneWeekAgo = BrazilTimezone.now();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        // Calcular data de 3 dias atrás para leads em proposta/reunião
        const threeDaysAgo = BrazilTimezone.now();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const threeDaysAgoStr = threeDaysAgo.toISOString();

        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT l.id, l.name, l.phone, l.status, l.updated_at
            FROM ${tenantSchema}.leads l
            WHERE l.user_id = '${currentUser.id}'
              AND (
                (l.status IN ('Finalizado', 'Perdido') AND l.updated_at >= '${oneWeekAgoStr}')
                OR
                (l.status IN ('Proposta', 'Reunião') AND l.updated_at <= '${threeDaysAgoStr}')
              )
            ORDER BY l.updated_at DESC
            LIMIT 20
          `
        });

        if (error) {
          console.error("❌ Erro ao buscar leads para follow up:", error);
          return;
        }

        const leadsData: Lead[] = Array.isArray(data) ? (data as unknown as Lead[]) : [];
        console.log(`✅ WeeklyFollowUpTask - ${leadsData.length} leads encontrados para follow up`);
        setLeads(leadsData);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowUpLeads();
  }, [tenantSchema, currentUser]);

  const handleConcludeTask = async (leadId: string) => {
    try {
      console.log(`✅ Concluindo tarefa de follow up para lead ${leadId}`);
      
      // Remove o lead da lista local
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      
      toast({
        title: "Sucesso",
        description: "Follow up marcado como concluído.",
      });
    } catch (error) {
      console.error("❌ Erro ao concluir follow up:", error);
      toast({
        title: "Erro",
        description: "Erro ao marcar follow up como concluído.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-blue-100 text-blue-700';
      case 'Perdido':
        return 'bg-red-100 text-red-700';
      case 'Proposta':
        return 'bg-yellow-100 text-yellow-700';
      case 'Reunião':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskReason = (status: string, updatedAt: string) => {
    const daysSince = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (['Finalizado', 'Perdido'].includes(status)) {
      return `${status} há ${daysSince} dias - Verificar satisfação`;
    } else if (['Proposta', 'Reunião'].includes(status)) {
      return `Em ${status} há ${daysSince} dias - Necessita follow up`;
    }
    return '';
  };

  const formatDate = (dateString: string) => {
    const date = BrazilTimezone.toLocal(new Date(dateString));
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Follow UP
        </h3>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">
            Leads que Precisam de Follow Up
          </h4>
          <p className="text-sm text-gray-600">
            Leads finalizados/perdidos na última semana ou em proposta/reunião há mais de 3 dias.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando leads...</span>
          </div>
        ) : leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-medium text-gray-900">{lead.name}</h5>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>{lead.phone}</span>
                      <span>Atualizado em {formatDate(lead.updated_at)}</span>
                    </div>
                    <p className="text-xs text-orange-600 font-medium">
                      {getTaskReason(lead.status, lead.updated_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConcludeTask(lead.id)}
                    className="ml-3 text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Concluído
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600">
              Nenhum lead necessita follow up no momento.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
