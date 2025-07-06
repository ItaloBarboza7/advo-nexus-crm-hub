import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Target, TrendingUp, Users } from "lucide-react";
import { BrazilTimezone } from "@/lib/timezone";
import { useContractsData } from "@/hooks/useContractsData";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { ActivityPanel } from "@/components/ActivityPanel";
import { MonthlyGoalsPanel } from "@/components/MonthlyGoalsPanel";
import { TeamGoalsPanel } from "@/components/TeamGoalsPanel";
import { useTeamResults } from "@/hooks/useTeamResults";
import { WeeklyFollowUpTask } from "@/components/WeeklyFollowUpTask";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { supabase } from "@/integrations/supabase/client";

export function CalendarContent() {
  const [selectedDate, setSelectedDate] = useState<Date>(BrazilTimezone.now());
  const [showActivityPanel, setShowActivityPanel] = useState(false);

  const { tenantSchema } = useTenantSchema();
  const { teamResults, isLoadingTeam } = useTeamResults();

  const { 
    contracts, 
    isLoading: contractsLoading, 
    error: contractsError, 
    currentUser: contractsUser, 
    fetchContractsForDate 
  } = useContractsData();

  const { 
    leads, 
    isLoading: leadsLoading, 
    error: leadsError, 
    currentUser: leadsUser, 
    fetchLeadsForDate 
  } = useLeadsForDate();

  // Estados para atividades filtradas do usuário atual
  const [userContracts, setUserContracts] = useState<any[]>([]);
  const [userLeads, setUserLeads] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<{id: string, name: string} | null>(null);

  // Função para buscar dados filtrados do usuário atual
  const fetchUserActivityData = useCallback(async (date: Date) => {
    if (!tenantSchema) return;
    
    try {
      console.log("🔍 CalendarContent - Buscando atividades do usuário para:", BrazilTimezone.formatDateForDisplay(date));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("❌ Usuário não autenticado");
        return;
      }

      console.log("👤 Usuário atual:", user.id);

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      setCurrentUserData({
        id: user.id,
        name: profile?.name || 'Usuário'
      });

      const dateStr = BrazilTimezone.formatDateForQuery(date);
      
      // Buscar contratos fechados pelo usuário atual na data selecionada
      const { data: contractsData, error: contractsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            l.id,
            l.name as client_name,
            l.phone,
            l.email,
            l.value,
            l.updated_at as closed_at,
            l.closed_by_user_id,
            up.name as closed_by_name
          FROM ${tenantSchema}.leads l
          LEFT JOIN public.user_profiles up ON l.closed_by_user_id = up.user_id
          WHERE l.status = 'Contrato Fechado'
            AND l.closed_by_user_id = '${user.id}'
            AND DATE(l.updated_at AT TIME ZONE 'America/Sao_Paulo') = '${dateStr}'
          ORDER BY l.updated_at DESC
        `
      });

      if (contractsError) {
        console.error("❌ Erro ao buscar contratos do usuário:", contractsError);
        return;
      }

      // Processar contratos
      let processedContracts: any[] = [];
      if (Array.isArray(contractsData) && contractsData.length > 0) {
        processedContracts = contractsData.map((contract: any) => ({
          id: contract.id,
          clientName: contract.client_name,
          closedBy: contract.closed_by_name || 'N/A',
          value: contract.value || 0,
          closedAt: BrazilTimezone.toLocal(contract.closed_at),
          email: contract.email,
          phone: contract.phone
        }));
      }

      console.log(`✅ ${processedContracts.length} contratos encontrados para o usuário`);

      // Buscar leads cadastrados pelo usuário atual na data selecionada
      const { data: leadsData, error: leadsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT *
          FROM ${tenantSchema}.leads l
          WHERE l.user_id = '${user.id}'
            AND DATE(l.created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateStr}'
          ORDER BY l.created_at DESC
        `
      });

      if (leadsError) {
        console.error("❌ Erro ao buscar leads do usuário:", leadsError);
        return;
      }

      // Processar leads
      let processedLeads: any[] = [];
      if (Array.isArray(leadsData) && leadsData.length > 0) {
        processedLeads = leadsData.map((lead: any) => ({
          ...lead,
          created_at: lead.created_at,
          updated_at: lead.updated_at
        }));
      }

      console.log(`✅ ${processedLeads.length} leads encontrados para o usuário`);

      setUserContracts(processedContracts);
      setUserLeads(processedLeads);

    } catch (error) {
      console.error("❌ Erro inesperado ao buscar atividades do usuário:", error);
    }
  }, [tenantSchema]);

  // Buscar dados quando a data é selecionada
  useEffect(() => {
    if (showActivityPanel && selectedDate) {
      fetchUserActivityData(selectedDate);
    }
  }, [showActivityPanel, selectedDate, fetchUserActivityData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      console.log("📅 Data selecionada:", BrazilTimezone.formatDateForDisplay(date));
      setSelectedDate(date);
      setShowActivityPanel(true);
      // Os dados serão buscados pelo useEffect acima
    }
  };

  const handleCloseActivityPanel = () => {
    setShowActivityPanel(false);
    setUserContracts([]);
    setUserLeads([]);
  };

  const getContractsStats = useCallback(() => {
    if (!tenantSchema || !leadsUser) return { currentMonth: { leads: 0, proposals: 0, sales: 0, points: 0 }, previousMonth: { leads: 0, proposals: 0, sales: 0, points: 0 }, withoutFilter: { leads: 0, proposals: 0, sales: 0, points: 0 } };

    console.log("🔍 DEBUGGING CalendarContent - getContractsStats:");
    console.log("📊 Total de leads no sistema:", leads?.length || 0);
    console.log("👤 Current user ID:", leadsUser.id);

    if (!leads || leads.length === 0) {
      return { currentMonth: { leads: 0, proposals: 0, sales: 0, points: 0 }, previousMonth: { leads: 0, proposals: 0, sales: 0, points: 0 }, withoutFilter: { leads: 0, proposals: 0, sales: 0, points: 0 } };
    }

    const now = BrazilTimezone.now();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    console.log("📅 Mês atual:", currentMonth + 1, "Ano:", currentYear);

    const userLeads = leads.filter(lead => lead.user_id === leadsUser.id);
    console.log("👤 Leads do usuário atual (total):", userLeads.length);

    console.log("🔍 CALCULANDO SEM FILTRO DE MÊS (como no TeamResults):");
    const withoutFilterProposals = userLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) return true;
      return false;
    });
    
    const withoutFilterSales = userLeads.filter(lead => lead.status === 'Contrato Fechado');
    const withoutFilterPoints = (userLeads.length * 5) + (withoutFilterProposals.length * 10) + (withoutFilterSales.length * 100);

    console.log("📈 SEM FILTRO DE MÊS:");
    console.log("  - Leads:", userLeads.length);
    console.log("  - Propostas:", withoutFilterProposals.length);
    console.log("  - Vendas:", withoutFilterSales.length);
    console.log("  - PONTOS TOTAIS:", withoutFilterPoints);

    const currentMonthLeads = userLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    });
    
    console.log("📅 COM FILTRO DE MÊS ATUAL (julho):");
    console.log("  - Leads do mês atual:", currentMonthLeads.length);

    const currentMonthProposals = currentMonthLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) return true;
      return false;
    });
    
    const currentMonthSales = currentMonthLeads.filter(lead => lead.status === 'Contrato Fechado');
    const currentMonthPoints = (currentMonthLeads.length * 5) + (currentMonthProposals.length * 10) + (currentMonthSales.length * 100);

    console.log("  - Propostas do mês:", currentMonthProposals.length);
    console.log("  - Vendas do mês:", currentMonthSales.length);
    console.log("💰 PONTOS DO MÊS ATUAL:", currentMonthPoints);

    const previousMonthLeads = userLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === previousMonth && leadDate.getFullYear() === previousYear;
    });

    const previousMonthProposals = previousMonthLeads.filter(lead => {
      if (['Proposta', 'Reunião'].includes(lead.status)) return true;
      return false;
    });
    
    const previousMonthSales = previousMonthLeads.filter(lead => lead.status === 'Contrato Fechado');
    const previousMonthPoints = (previousMonthLeads.length * 5) + (previousMonthProposals.length * 10) + (previousMonthSales.length * 100);

    console.log("💰 PONTOS DO MÊS ANTERIOR:", previousMonthPoints);

    const result = {
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
        proposals: withoutFilterProposals.length,
        sales: withoutFilterSales.length,
        points: withoutFilterPoints
      }
    };

    console.log(`📊 CalendarContent - Estatísticas calculadas para ${leadsUser.name}:`, result);
    return result;
  }, [leads, leadsUser, tenantSchema]);

  const userStats = getContractsStats();
  const teamSales = teamResults?.reduce((sum, member) => sum + member.closed_contracts, 0) || 0;

  const now = BrazilTimezone.now();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Calendário e Metas</h1>
      </div>

      {showActivityPanel && (
        <ActivityPanel
          selectedDate={selectedDate}
          contracts={userContracts}
          leads={userLeads}
          isLoading={false}
          error={null}
          currentUser={currentUserData}
          onClose={handleCloseActivityPanel}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border w-full"
              locale={{
                localize: {
                  day: (n: number) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][n],
                  month: (n: number) => [
                    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                  ][n]
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Goals */}
        <div className="lg:col-span-2 space-y-6">
          <MonthlyGoalsPanel
            currentSales={userStats.currentMonth.sales}
            daysInMonth={daysInMonth}
            currentDay={currentDay}
          />
          
          <TeamGoalsPanel
            teamSales={teamSales}
            daysInMonth={daysInMonth}
            currentDay={currentDay}
            teamSize={teamResults?.length || 0}
          />
        </div>
      </div>

      {/* Weekly Follow-up */}
      <WeeklyFollowUpTask />
    </div>
  );
}
