
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flag } from "lucide-react";
import { UserComparisonCard } from "@/components/UserComparisonCard";
import { ActivityPanel } from "@/components/ActivityPanel";
import { IntegratedCalendar } from "@/components/IntegratedCalendar";
import { RecoverableLeadsTask } from "@/components/RecoverableLeadsTask";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useContractsData } from "@/hooks/useContractsData";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { supabase } from "@/integrations/supabase/client";
import { BrazilTimezone } from "@/lib/timezone";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function CalendarContent() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const { leads, isLoading } = useLeadsData();
  const { tenantSchema } = useTenantSchema();
  const { 
    contracts, 
    isLoading: contractsLoading, 
    error: contractsError, 
    currentUser: contractsUser, 
    fetchContractsForDate 
  } = useContractsData();
  const {
    leads: leadsForDate,
    isLoading: leadsLoading,
    error: leadsError,
    currentUser: leadsCurrentUser,
    fetchLeadsForDate
  } = useLeadsForDate();

  // Definir automaticamente o dia atual quando a página carrega (usando timezone brasileiro)
  useEffect(() => {
    const today = BrazilTimezone.now();
    BrazilTimezone.debugLog("📅 CalendarContent - Data atual definida", today);
    
    setSelectedDate(today);
  }, []);

  // Buscar informações do usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar o perfil do usuário para obter o nome
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          name: profile?.name || user.email || 'Usuário'
        });
      }
    };

    getCurrentUser();
  }, []);

  // Buscar histórico de status quando o tenant schema estiver disponível
  useEffect(() => {
    const fetchStatusHistory = async () => {
      if (!tenantSchema) return;
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `SELECT * FROM ${tenantSchema}.lead_status_history ORDER BY changed_at DESC`
        });

        if (error) {
          console.error("❌ Erro ao buscar histórico de status:", error);
          return;
        }

        const historyData = Array.isArray(data) ? data : [];
        console.log(`📈 CalendarContent - ${historyData.length} registros de histórico encontrados`);
        setStatusHistory(historyData);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar histórico:", error);
      }
    };

    fetchStatusHistory();
  }, [tenantSchema]);

  // Buscar contratos e leads quando uma data é selecionada
  useEffect(() => {
    if (selectedDate && contractsUser && fetchContractsForDate) {
      fetchContractsForDate(selectedDate);
    }
    if (selectedDate && leadsCurrentUser && fetchLeadsForDate) {
      fetchLeadsForDate(selectedDate);
    }
  }, [selectedDate, contractsUser, leadsCurrentUser]);

  // Função para verificar se um lead passou por determinados status (MESMA LÓGICA DO TEAM RESULTS)
  const hasLeadPassedThroughStatus = (leadId: string, statuses: string[]): boolean => {
    return statusHistory.some(history => 
      history.lead_id === leadId && statuses.includes(history.new_status)
    );
  };

  // Calcular estatísticas reais usando a MESMA LÓGICA do useTeamResults
  const getContractsStats = () => {
    if (!leads || leads.length === 0 || !currentUser) {
      return {
        currentMonth: { completed: 0, points: 0 },
        previousMonth: { completed: 0, points: 0 },
        goal: 1000
      };
    }

    const now = BrazilTimezone.now();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filtrar leads do usuário atual
    const userLeads = leads.filter(lead => lead.user_id === currentUser.id);

    // Calcular dados do mês atual
    const currentMonthLeads = userLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const leadDateLocal = BrazilTimezone.toLocal(leadDate);
      return leadDateLocal.getMonth() === currentMonth && leadDateLocal.getFullYear() === currentYear;
    });

    const currentMonthProposals = currentMonthLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) {
        return true;
      }
      return hasLeadPassedThroughStatus(lead.id, ['Proposta', 'Reunião']);
    });

    const currentMonthSales = currentMonthLeads.filter(lead => 
      lead.status === 'Contrato Fechado'
    );

    // Calcular dados do mês anterior
    const previousMonthLeads = userLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const leadDateLocal = BrazilTimezone.toLocal(leadDate);
      return leadDateLocal.getMonth() === previousMonth && leadDateLocal.getFullYear() === previousYear;
    });

    const previousMonthProposals = previousMonthLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) {
        return true;
      }
      return hasLeadPassedThroughStatus(lead.id, ['Proposta', 'Reunião']);
    });

    const previousMonthSales = previousMonthLeads.filter(lead => 
      lead.status === 'Contrato Fechado'
    );

    // USAR A MESMA LÓGICA DE PONTUAÇÃO: Leads = 5pts, Propostas = 10pts, Vendas = 100pts
    const currentMonthPoints = (currentMonthLeads.length * 5) + (currentMonthProposals.length * 10) + (currentMonthSales.length * 100);
    const previousMonthPoints = (previousMonthLeads.length * 5) + (previousMonthProposals.length * 10) + (previousMonthSales.length * 100);

    console.log(`📊 CalendarContent - Estatísticas calculadas:`, {
      currentMonth: {
        leads: currentMonthLeads.length,
        proposals: currentMonthProposals.length,
        sales: currentMonthSales.length,
        points: currentMonthPoints
      },
      previousMonth: {
        leads: previousMonthLeads.length,
        proposals: previousMonthProposals.length,
        sales: previousMonthSales.length,
        points: previousMonthPoints
      }
    });
    
    return {
      currentMonth: {
        completed: currentMonthSales.length,
        points: currentMonthPoints
      },
      previousMonth: {
        completed: previousMonthSales.length,
        points: previousMonthPoints
      },
      goal: 1000
    };
  };

  const contractsStats = getContractsStats();

  // Metas mensais baseadas nos dados reais do usuário
  const now = BrazilTimezone.now();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const monthlyGoals = {
    totalGoal: 50,
    achieved: contractsStats.currentMonth.completed,
    percentage: Math.round((contractsStats.currentMonth.completed / 50) * 100),
    month: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    remaining: Math.max(0, 50 - contractsStats.currentMonth.completed)
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    BrazilTimezone.debugLog("📅 Data selecionada pelo usuário", date);
  };

  const handleCloseActivityPanel = () => {
    setSelectedDate(null);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados das metas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Metas</h1>
          <p className="text-gray-600">Acompanhe suas metas de contratos fechados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual Comparison - Left Side */}
        <div className="lg:col-span-2">
          <UserComparisonCard
            userName={currentUser.name}
            currentMonth={contractsStats.currentMonth}
            previousMonth={contractsStats.previousMonth}
            goal={contractsStats.goal}
          />
        </div>

        {/* Calendar Widget - Right Side */}
        <div className="lg:col-span-1">
          <IntegratedCalendar 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>
      </div>

      {/* Activity Panel */}
      {selectedDate && (
        <ActivityPanel 
          selectedDate={selectedDate}
          contracts={contracts}
          leads={leadsForDate}
          isLoading={contractsLoading || leadsLoading}
          error={contractsError || leadsError}
          currentUser={contractsUser || leadsCurrentUser}
          onClose={handleCloseActivityPanel}
        />
      )}

      {/* Recoverable Leads Task */}
      <RecoverableLeadsTask userName={currentUser.name} />

      {/* Monthly Goal Summary - Bottom */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Flag className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sua Meta Mensal - {monthlyGoals.month}</h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{monthlyGoals.achieved}</div>
              <div className="text-sm text-gray-600">Contratos Fechados por Você</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700">{monthlyGoals.totalGoal}</div>
              <div className="text-sm text-gray-600">Sua Meta Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{monthlyGoals.percentage}%</div>
              <div className="text-sm text-gray-600">Seu Progresso</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{monthlyGoals.remaining}</div>
              <div className="text-sm text-gray-600">Restante</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progresso da Sua Meta</span>
              <span>{monthlyGoals.achieved}/{monthlyGoals.totalGoal}</span>
            </div>
            <Progress value={monthlyGoals.percentage} className="h-3 [&>div]:bg-blue-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}
