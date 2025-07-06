
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flag } from "lucide-react";
import { UserComparisonCard } from "@/components/UserComparisonCard";
import { ActivityPanel } from "@/components/ActivityPanel";
import { IntegratedCalendar } from "@/components/IntegratedCalendar";
import { WeeklyFollowUpTask } from "@/components/WeeklyFollowUpTask";
import { TeamGoalsPanel } from "@/components/TeamGoalsPanel";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useUserContractsData } from "@/hooks/useUserContractsData";
import { useUserLeadsForDate } from "@/hooks/useUserLeadsForDate";
import { useTeamResults } from "@/hooks/useTeamResults";
import { supabase } from "@/integrations/supabase/client";
import { BrazilTimezone } from "@/lib/timezone";
import { useTenantSchema } from "@/hooks/useTenantSchema";

export function CalendarContent() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const { leads, isLoading } = useLeadsData();
  const { tenantSchema } = useTenantSchema();
  const { teamMembers, teamStats, isLoading: teamLoading } = useTeamResults();
  
  // Use user-specific hooks for Activity Panel
  const { 
    contracts, 
    isLoading: contractsLoading, 
    error: contractsError, 
    currentUser: contractsUser, 
    fetchContractsForDate 
  } = useUserContractsData();
  
  const {
    leads: leadsForDate,
    isLoading: leadsLoading,
    error: leadsError,
    currentUser: leadsCurrentUser,
    fetchLeadsForDate
  } = useUserLeadsForDate();

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

  // DEBUGGING: Calcular estatísticas reais usando a MESMA LÓGICA do useTeamResults mas para o usuário atual
  const getContractsStats = () => {
    if (!leads || leads.length === 0 || !currentUser) {
      return {
        currentMonth: { completed: 0, points: 0 },
        previousMonth: { completed: 0, points: 0 },
        goal: 1000
      };
    }

    console.log("🔍 DEBUGGING CalendarContent - getContractsStats:");
    console.log("📊 Total de leads no sistema:", leads.length);
    console.log("👤 Current user ID:", currentUser.id);
    console.log("📈 Status history entries:", statusHistory.length);

    const now = BrazilTimezone.now();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    console.log("📅 Mês atual:", currentMonth + 1, "Ano:", currentYear);

    // Filtrar leads do usuário atual
    const userLeads = leads.filter(lead => lead.user_id === currentUser.id);
    console.log("👤 Leads do usuário atual (total):", userLeads.length);

    // *** REMOVER FILTRO POR MÊS PARA COMPARAR COM TEAMRESULTS ***
    // Vamos calcular SEM filtro de mês para ver se bate com os 295 pontos
    
    console.log("🔍 CALCULANDO SEM FILTRO DE MÊS (como no TeamResults):");
    
    const allUserProposals = userLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) {
        return true;
      }
      return hasLeadPassedThroughStatus(lead.id, ['Proposta', 'Reunião']);
    });

    const allUserSales = userLeads.filter(lead => 
      lead.status === 'Contrato Fechado'
    );

    const allUserPoints = (userLeads.length * 5) + (allUserProposals.length * 10) + (allUserSales.length * 100);

    console.log("📈 SEM FILTRO DE MÊS:");
    console.log("  - Leads:", userLeads.length);
    console.log("  - Propostas:", allUserProposals.length);
    console.log("  - Vendas:", allUserSales.length);
    console.log("  - PONTOS TOTAIS:", allUserPoints);

    // Agora calcular COM filtro de mês (lógica atual)
    const currentMonthLeads = userLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const leadDateLocal = BrazilTimezone.toLocal(leadDate);
      return leadDateLocal.getMonth() === currentMonth && leadDateLocal.getFullYear() === currentYear;
    });

    console.log("📅 COM FILTRO DE MÊS ATUAL (julho):");
    console.log("  - Leads do mês atual:", currentMonthLeads.length);

    const currentMonthProposals = currentMonthLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) {
        return true;
      }
      return hasLeadPassedThroughStatus(lead.id, ['Proposta', 'Reunião']);
    });

    const currentMonthSales = currentMonthLeads.filter(lead => 
      lead.status === 'Contrato Fechado'
    );

    console.log("  - Propostas do mês:", currentMonthProposals.length);
    console.log("  - Vendas do mês:", currentMonthSales.length);

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

    console.log("💰 PONTOS DO MÊS ATUAL:", currentMonthPoints);
    console.log("💰 PONTOS DO MÊS ANTERIOR:", previousMonthPoints);

    console.log(`📊 CalendarContent - Estatísticas calculadas para ${currentUser.name}:`, {
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
      },
      withoutFilter: {
        leads: userLeads.length,
        proposals: allUserProposals.length,
        sales: allUserSales.length,
        points: allUserPoints
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

  // Dados para o TeamGoalsPanel - usar dados da equipe
  const now = BrazilTimezone.now();
  const teamGoalData = {
    teamSales: teamStats?.totalSales || 0,
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    currentDay: now.getDate(),
    teamSize: teamStats?.teamSize || 1
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    BrazilTimezone.debugLog("📅 Data selecionada pelo usuário", date);
  };

  const handleCloseActivityPanel = () => {
    setSelectedDate(null);
  };

  if (isLoading || !currentUser || teamLoading) {
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
          <p className="text-gray-600">Acompanhe as metas de contratos fechados da equipe</p>
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

      {/* Weekly Follow Up Task */}
      <WeeklyFollowUpTask userName={currentUser.name} />

      {/* Team Goals Panel - Novo painel da equipe */}
      <TeamGoalsPanel 
        teamSales={teamGoalData.teamSales}
        daysInMonth={teamGoalData.daysInMonth}
        currentDay={teamGoalData.currentDay}
        teamSize={teamGoalData.teamSize}
      />
    </div>
  );
}
