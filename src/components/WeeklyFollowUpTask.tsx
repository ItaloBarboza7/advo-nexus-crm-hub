
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { BrazilTimezone } from "@/lib/timezone";

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

  // Buscar informações do usuário atual
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

  // Buscar leads movidos para "Finalizado" ou "Perdido" na última semana
  useEffect(() => {
    const fetchWeeklyLeads = async () => {
      if (!tenantSchema || !currentUser) return;
      
      try {
        setIsLoading(true);
        console.log("🔍 WeeklyFollowUpTask - Buscando leads da última semana...");
        
        // Calcular data de uma semana atrás
        const oneWeekAgo = BrazilTimezone.now();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT l.id, l.name, l.phone, l.status, l.updated_at
            FROM ${tenantSchema}.leads l
            WHERE l.user_id = '${currentUser.id}'
              AND l.status IN ('Finalizado', 'Perdido')
              AND l.updated_at >= '${oneWeekAgoStr}'
            ORDER BY l.updated_at DESC
            LIMIT 10
          `
        });

        if (error) {
          console.error("❌ Erro ao buscar leads da última semana:", error);
          return;
        }

        const leadsData = Array.isArray(data) ? data : [];
        console.log(`✅ WeeklyFollowUpTask - ${leadsData.length} leads encontrados da última semana`);
        setLeads(leadsData);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyLeads();
  }, [tenantSchema, currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-gray-100 text-gray-800';
      case 'Perdido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
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
        <Clock className="h-6 w-6 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Leads para Follow Up - {userName}
        </h3>
      </div>
      
      <div className="bg-gradient-to-r from-orange-50 to-yellow-100 p-6 rounded-lg border-l-4 border-orange-500">
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">
            Leads Finalizados/Perdidos na Última Semana
          </h4>
          <p className="text-sm text-gray-600">
            Estes leads foram movidos para "Finalizado" ou "Perdido" recentemente. 
            Considere fazer um follow up para verificar satisfação ou identificar novas oportunidades.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-gray-600">Carregando leads...</span>
          </div>
        ) : leads.length > 0 ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-medium text-gray-900">{lead.name}</h5>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Atualizado em {formatDate(lead.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Ligar para o lead"
                      onClick={() => window.open(`tel:${lead.phone}`)}
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="Enviar WhatsApp"
                      onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600">
              Nenhum lead foi finalizado ou perdido na última semana.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
