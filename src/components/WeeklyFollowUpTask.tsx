
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, Phone } from "lucide-react";
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

        // Calcular data de 3 dias atrás para follow-ups concluídos
        const threeDaysAgoForCompleted = BrazilTimezone.now();
        threeDaysAgoForCompleted.setDate(threeDaysAgoForCompleted.getDate() - 3);
        const threeDaysAgoForCompletedStr = threeDaysAgoForCompleted.toISOString();

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
              AND NOT EXISTS (
                SELECT 1 FROM ${tenantSchema}.completed_followups cf
                WHERE cf.lead_id = l.id 
                  AND cf.user_id = '${currentUser.id}'
                  AND (
                    -- Se o lead está "Perdido", nunca mostrar novamente após concluído
                    (l.status = 'Perdido') 
                    OR 
                    -- Para outros status, só mostrar se passou mais de 3 dias desde a conclusão
                    (l.status != 'Perdido' AND cf.completed_at > '${threeDaysAgoForCompletedStr}')
                  )
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

  const handleConcludeTask = async (leadId: string, leadStatus: string) => {
    try {
      console.log(`✅ Concluindo tarefa de follow up para lead ${leadId} com status ${leadStatus}`);
      
      if (!tenantSchema || !currentUser) {
        console.error("❌ Schema do tenant ou usuário não disponível");
        return;
      }

      // Registrar o follow up como concluído
      const { error: insertError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO ${tenantSchema}.completed_followups (lead_id, user_id, lead_status_at_completion, completed_at)
          VALUES ('${leadId}', '${currentUser.id}', '${leadStatus.replace(/'/g, "''")}', now())
          ON CONFLICT (lead_id, user_id) DO UPDATE SET
            completed_at = now(),
            lead_status_at_completion = '${leadStatus.replace(/'/g, "''")}'
        `
      });

      if (insertError) {
        console.error("❌ Erro ao registrar follow up concluído:", insertError);
        toast({
          title: "Erro",
          description: "Erro ao marcar follow up como concluído.",
          variant: "destructive"
        });
        return;
      }
      
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
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Perdido':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Proposta':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Reunião':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDaysAgo = (updatedAt: string) => {
    return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Follow UP
        </h3>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        ) : leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-medium text-gray-900 text-lg">{lead.name}</h5>
                      <Badge className={`${getStatusColor(lead.status)} text-xs font-medium border`}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">{lead.phone}</span>
                      <span className="text-sm text-gray-500">
                        • há {getDaysAgo(lead.updated_at)} dias
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleConcludeTask(lead.id, lead.status)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Concluído
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">
              Nenhum lead necessita follow up no momento
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Continue o excelente trabalho!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
