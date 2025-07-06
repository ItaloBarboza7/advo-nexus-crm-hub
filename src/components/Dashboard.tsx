
import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X, BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { DateRange } from "react-day-picker";
import { BrazilTimezone } from "@/lib/timezone";
import { ActivityPanel } from "@/components/ActivityPanel";
import { useLeadsForDate } from "@/hooks/useLeadsForDate";
import { useContractsData } from "@/hooks/useContractsData";
import { DateFilter } from "@/components/DateFilter";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(BrazilTimezone.now());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>();
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Use the data hooks
  const { 
    leads, 
    isLoading: leadsLoading, 
    error: leadsError, 
    currentUser: leadsUser, 
    fetchLeadsForDate,
    fetchLeadsForDateRange 
  } = useLeadsForDate();

  const { 
    contracts, 
    isLoading: contractsLoading, 
    error: contractsError, 
    currentUser: contractsUser, 
    fetchContractsForDate 
  } = useContractsData();

  // Fetch data when date changes or when date range is applied
  useEffect(() => {
    if (appliedDateRange?.from && appliedDateRange?.to) {
      console.log("📅 Dashboard - Filtrando por período:", {
        from: BrazilTimezone.formatDateForDisplay(appliedDateRange.from),
        to: BrazilTimezone.formatDateForDisplay(appliedDateRange.to)
      });
      fetchLeadsForDateRange(appliedDateRange);
      fetchContractsForDate(appliedDateRange.from);
    } else if (appliedDateRange?.from && !appliedDateRange?.to) {
      // Se apenas uma data foi selecionada, criar um range de um dia
      const singleDayRange = {
        from: appliedDateRange.from,
        to: appliedDateRange.from
      };
      console.log("📅 Dashboard - Filtrando por dia único:", BrazilTimezone.formatDateForDisplay(appliedDateRange.from));
      fetchLeadsForDateRange(singleDayRange);
      fetchContractsForDate(appliedDateRange.from);
    } else if (selectedDate) {
      console.log("📅 Dashboard - Data selecionada:", BrazilTimezone.formatDateForDisplay(selectedDate));
      fetchLeadsForDate(selectedDate);
      fetchContractsForDate(selectedDate);
    }
  }, [selectedDate, appliedDateRange, fetchLeadsForDate, fetchLeadsForDateRange, fetchContractsForDate]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      console.log("📅 Dashboard - Nova data selecionada:", BrazilTimezone.formatDateForDisplay(date));
      setSelectedDate(date);
      setAppliedDateRange(undefined); // Limpar filtro de período quando selecionar data específica
      setIsCalendarOpen(false);
    }
  }, []);

  const handleDateRangeApply = useCallback((range: DateRange | undefined) => {
    console.log("📅 Dashboard - Período aplicado:", range);
    setAppliedDateRange(range);
    if (range?.from) {
      // Limpar seleção de data individual quando aplicar período
      setSelectedDate(range.from);
    }
  }, []);

  const handleShowActivity = useCallback(() => {
    const displayDate = appliedDateRange?.from || selectedDate;
    console.log("🎯 Dashboard - Mostrando painel de atividades para:", BrazilTimezone.formatDateForDisplay(displayDate));
    setShowActivityPanel(true);
  }, [selectedDate, appliedDateRange]);

  const handleCloseActivity = useCallback(() => {
    console.log("❌ Dashboard - Fechando painel de atividades");
    setShowActivityPanel(false);
  }, []);

  // Filter data based on applied date range - sempre aplicar filtro se houver range
  const filteredLeads = appliedDateRange?.from
    ? leads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const fromDate = appliedDateRange.from!;
        const toDate = appliedDateRange.to || appliedDateRange.from!; // Se não tiver 'to', usar 'from'
        
        // Ajustar para o final do dia se for apenas um dia
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        return leadDate >= fromDate && leadDate <= endOfDay;
      })
    : leads;

  const filteredContracts = appliedDateRange?.from
    ? contracts.filter(contract => {
        const contractDate = new Date(contract.closedAt);
        const fromDate = appliedDateRange.from!;
        const toDate = appliedDateRange.to || appliedDateRange.from!; // Se não tiver 'to', usar 'from'
        
        // Ajustar para o final do dia se for apenas um dia
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        return contractDate >= fromDate && contractDate <= endOfDay;
      })
    : contracts;

  const totalValue = filteredContracts.reduce((sum, contract) => sum + contract.value, 0);

  const getDisplayTitle = () => {
    if (appliedDateRange?.from && appliedDateRange?.to) {
      return `Período de ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)} a ${BrazilTimezone.formatDateForDisplay(appliedDateRange.to)}`;
    } else if (appliedDateRange?.from) {
      return `Resumo das atividades de ${BrazilTimezone.formatDateForDisplay(appliedDateRange.from)}`;
    }
    return `Resumo das atividades de ${BrazilTimezone.formatDateForDisplay(selectedDate)}`;
  };

  console.log("🎯 Dashboard - Estado atual:", {
    selectedDate: BrazilTimezone.formatDateForDisplay(selectedDate),
    appliedDateRange,
    contractsCount: filteredContracts.length,
    leadsCount: filteredLeads.length,
    totalValue,
    showActivityPanel,
    leadsLoading,
    contractsLoading
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
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
                <Card className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Selecionar Data</span>
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
                    className="rounded-md border"
                  />
                </Card>
              </div>
            )}
          </div>
          
          <Button onClick={handleShowActivity} className="bg-blue-600 hover:bg-blue-700">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </div>
      </div>

      {/* Activity Panel */}
      {showActivityPanel && (
        <ActivityPanel
          selectedDate={appliedDateRange?.from || selectedDate}
          contracts={filteredContracts}
          leads={filteredLeads}
          isLoading={leadsLoading || contractsLoading}
          error={leadsError || contractsError}
          currentUser={leadsUser || contractsUser}
          onClose={handleCloseActivity}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Contratos Fechados</p>
              <p className="text-2xl font-bold text-gray-900">{filteredContracts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {totalValue.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {filteredContracts.length > 0 ? Math.round(totalValue / filteredContracts.length).toLocaleString('pt-BR') : '0'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leads Cadastrados</p>
              <p className="text-2xl font-bold text-gray-900">{filteredLeads.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Loading States */}
      {(leadsLoading || contractsLoading) && (
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
            <span>Carregando dados...</span>
          </div>
        </Card>
      )}

      {/* Error States */}
      {(leadsError || contractsError) && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Erro ao carregar dados:</p>
            <p className="text-sm mt-1">{leadsError || contractsError}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
