import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X, BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { DateRange } from "react-day-picker";
import { BrazilTimezone } from "@/lib/timezone";
import { ActivityPanel } from "@/components/ActivityPanel";
import { useLeadsData } from "@/hooks/useLeadsData";
import { useContractsData } from "@/hooks/useContractsData";
import { useUserLeadsForDate } from "@/hooks/useUserLeadsForDate";
import { useUserContractsData } from "@/hooks/useUserContractsData";
import { DateFilter } from "@/components/DateFilter";

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(BrazilTimezone.now());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>();
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { leads: allLeads, isLoading: leadsLoading } = useLeadsData();
  const { contracts: allContracts, isLoading: contractsLoading } = useContractsData();

  const { 
    leads: userLeads, 
    isLoading: userLeadsLoading, 
    error: userLeadsError, 
    currentUser: userLeadsUser, 
    fetchLeadsForDate: fetchUserLeadsForDate
  } = useUserLeadsForDate();

  const { 
    contracts: userContracts, 
    isLoading: userContractsLoading, 
    error: userContractsError, 
    currentUser: userContractsUser, 
    fetchContractsForDate: fetchUserContractsForDate 
  } = useUserContractsData();

  const getFilteredLeads = useCallback(() => {
    if (!allLeads || allLeads.length === 0) return [];
    
    if (!appliedDateRange) return allLeads;

    const fromDate = appliedDateRange.from;
    const toDate = appliedDateRange.to || appliedDateRange.from;

    return allLeads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      const leadDateLocal = BrazilTimezone.toLocal(leadDate);
      const leadDateOnly = new Date(leadDateLocal.getFullYear(), leadDateLocal.getMonth(), leadDateLocal.getDate());
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      return leadDateOnly >= fromDateOnly && leadDateOnly <= toDateOnly;
    });
  }, [allLeads, appliedDateRange]);

  const getFilteredContracts = useCallback(() => {
    if (!allContracts || allContracts.length === 0) return [];
    
    if (!appliedDateRange) return allContracts;

    const fromDate = appliedDateRange.from;
    const toDate = appliedDateRange.to || appliedDateRange.from;

    return allContracts.filter(contract => {
      const contractDate = new Date(contract.closedAt);
      const contractDateLocal = BrazilTimezone.toLocal(contractDate);
      const contractDateOnly = new Date(contractDateLocal.getFullYear(), contractDateLocal.getMonth(), contractDateLocal.getDate());
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      return contractDateOnly >= fromDateOnly && contractDateOnly <= toDateOnly;
    });
  }, [allContracts, appliedDateRange]);

  useEffect(() => {
    const now = BrazilTimezone.now();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const currentMonthRange = {
      from: startOfMonth,
      to: endOfMonth
    };
    
    console.log("📅 Dashboard - Definindo período padrão como mês atual:", {
      from: BrazilTimezone.formatDateForDisplay(startOfMonth),
      to: BrazilTimezone.formatDateForDisplay(endOfMonth)
    });
    
    setAppliedDateRange(currentMonthRange);
  }, []);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      console.log("📅 Dashboard - Nova data selecionada:", BrazilTimezone.formatDateForDisplay(date));
      setSelectedDate(date);
      setAppliedDateRange(undefined);
      setIsCalendarOpen(false);
    }
  }, []);

  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    console.log("📅 Dashboard - Período aplicado:", range);
    setAppliedDateRange(range);
    if (range?.from) {
      setSelectedDate(range.from);
    }
  }, []);

  const handleShowActivity = useCallback(() => {
    const displayDate = appliedDateRange?.from || selectedDate;
    console.log("🎯 Dashboard - Mostrando painel de atividades para:", BrazilTimezone.formatDateForDisplay(displayDate));
    setShowActivityPanel(true);
    
    fetchUserLeadsForDate(displayDate);
    fetchUserContractsForDate(displayDate);
  }, [selectedDate, appliedDateRange, fetchUserLeadsForDate, fetchUserContractsForDate]);

  const handleCloseActivity = useCallback(() => {
    console.log("❌ Dashboard - Fechando painel de atividades");
    setShowActivityPanel(false);
  }, []);

  const displayLeads = getFilteredLeads();
  const displayContracts = getFilteredContracts();

  const totalValue = displayContracts.reduce((sum, contract) => sum + contract.value, 0);

  const totalLeadsCount = displayLeads.length;
  const proposalsAndMeetings = displayLeads.filter(lead => 
    lead.status === "Proposta" || lead.status === "Reunião"
  ).length;
  const lostLeads = displayLeads.filter(lead => lead.status === "Perdido").length;
  const closedDeals = displayLeads.filter(lead => lead.status === "Contrato Fechado").length;

  console.log("🎯 Dashboard - Dados finais:", {
    totalLeadsFromFiltered: displayLeads.length,
    totalLeadsCount,
    proposalsAndMeetings,
    lostLeads,
    closedDeals,
    appliedDateRange
  });

  const getDisplayTitle = () => {
    if (appliedDateRange?.from && appliedDateRange?.to) {
      const now = BrazilTimezone.now();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const isCurrentMonth = 
        appliedDateRange.from.getTime() === startOfCurrentMonth.getTime() &&
        appliedDateRange.to.getTime() === endOfCurrentMonth.getTime();
      
      if (isCurrentMonth) {
        return `Resumo das atividades do mês atual (${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
      }
      
      return `Período de ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)} a ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to)}`;
    } else if (appliedDateRange?.from) {
      return `Resumo das atividades de ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)}`;
    }
    return `Resumo das atividades de ${BrazilTimezone.formatDateForDisplay(selectedDate)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {getDisplayTitle()}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <DateFilter 
            date={dateRange} 
            setDate={setDateRange}
            onApply={handleDateRangeApply}
          />
          
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {BrazilTimezone.formatDateForDisplay(selectedDate)}
            </Button>
            
            {isCalendarOpen && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <Card className="p-3 bg-popover border-border shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-popover-foreground">Selecionar Data</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCalendarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="rounded-md border border-border"
                  />
                </Card>
              </div>
            )}
          </div>
          
          <Button onClick={handleShowActivity} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </div>
      </div>

      {/* Activity Panel */}
      {showActivityPanel && (
        <ActivityPanel
          selectedDate={appliedDateRange?.from || selectedDate}
          contracts={userContracts}
          leads={userLeads}
          isLoading={userLeadsLoading || userContractsLoading}
          error={userLeadsError || userContractsError}
          currentUser={userLeadsUser || userContractsUser}
          onClose={handleCloseActivity}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Contratos Fechados</p>
              <p className="text-2xl font-bold text-card-foreground">{closedDeals}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-card-foreground">
                R$ {totalValue.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold text-card-foreground">
                R$ {closedDeals > 0 ? Math.round(totalValue / closedDeals).toLocaleString('pt-BR') : '0'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Leads Cadastrados</p>
              <p className="text-2xl font-bold text-card-foreground">{totalLeadsCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="p-4 bg-muted/50 border-border shadow-sm">
        <h3 className="font-medium mb-2 text-card-foreground">Debug Info:</h3>
        <div className="text-sm text-muted-foreground">
          <p>Leads retornados (filtrados): {displayLeads.length}</p>
          <p>Contratos retornados (filtrados): {displayContracts.length}</p>
          <p>Período aplicado: {appliedDateRange ? 
            `${BrazilTimezone.formatDateForDisplay(appliedDateRange.from!)} - ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to!)}` 
            : 'Nenhum'}</p>
          <p>Hook carregando: {leadsLoading || contractsLoading ? 'Sim' : 'Não'}</p>
        </div>
      </Card>

      {/* Loading States */}
      {(leadsLoading || contractsLoading) && (
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
            <span className="text-card-foreground">Carregando dados...</span>
          </div>
        </Card>
      )}
    </div>
  );
}
