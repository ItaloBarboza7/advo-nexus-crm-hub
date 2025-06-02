import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { LossReasonsChart } from "@/components/LossReasonsChart";
import { ActionTypesChart } from "@/components/ActionTypesChart";
import { StateStatsChart } from "@/components/StateStatsChart";
import { GroupedLeadsList } from "@/components/GroupedLeadsList";
import { AdvancedFilters, FilterOptions } from "@/components/AdvancedFilters";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { EditLeadForm } from "@/components/EditLeadForm";
import { AnalysisStats } from "@/components/analysis/AnalysisStats";
import { CategoryButtons } from "@/components/analysis/CategoryButtons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useLeadStatusHistory } from "@/hooks/useLeadStatusHistory";
import { useAnalysisLogic } from "@/hooks/useAnalysisLogic";

interface LossReason {
  id: string;
  reason: string;
}

export function CasesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>({
    status: [],
    source: [],
    actionType: [],
    state: [],
    lossReason: [],
    valueRange: { min: null, max: null }
  });
  const { toast } = useToast();
  const { statusHistory, hasLeadPassedThroughStatus } = useLeadStatusHistory();
  const {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowStateChart
  } = useAnalysisLogic(leads, selectedCategory, statusHistory, hasLeadPassedThroughStatus);

  const fetchLossReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('Erro ao buscar motivos de perda:', error);
        return;
      }

      setLossReasons(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar motivos de perda:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    console.log("🔍 CasesContent - handleViewDetails chamado com lead:", lead.name);
    setSelectedLead(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    console.log("✏️ CasesContent - handleEditLead chamado com lead:", lead.name);
    console.log("📋 Lead completo:", lead);
    setSelectedLead(lead);
    setIsEditFormOpen(true);
    setIsDetailsDialogOpen(false);
  };

  useEffect(() => {
    fetchLossReasons();
    fetchLeads();
  }, []);

  // Função para verificar se um lead é uma oportunidade
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [CasesContent] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [CasesContent] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Excluir leads com status final (Perdido/Contrato Fechado)
    if (lead.status === "Perdido" || lead.status === "Contrato Fechado") {
      console.log(`❌ [CasesContent] Lead ${lead.name} está em status final (${lead.status}) - EXCLUÍDO`);
      return false;
    }
    
    // TERCEIRO: Para leads em outros status, verificar se passaram por Proposta/Reunião
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [CasesContent] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    // Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [CasesContent] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // Para outros status, deve ter passado por Proposta/Reunião
    if (!hasPassedThroughTargetStatuses) {
      console.log(`❌ [CasesContent] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
      return false;
    }
    
    console.log(`✅ [CasesContent] Lead ${lead.name} passou por Proposta/Reunião e está em ${lead.status} - INCLUÍDO`);
    return true;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Extrair categoria principal para filtros
    const mainCategory = selectedCategory.split('-')[0];
    
    // LÓGICA CORRIGIDA: usar a mesma regra do useAnalysisLogic
    const matchesCategory = selectedCategory === "all" || 
      (mainCategory === "contratos" && lead.status === "Contrato Fechado") ||
      (mainCategory === "oportunidades" && isOpportunityLead(lead)) ||  // CORRIGIDO: usar função específica
      (mainCategory === "perdas" && lead.status === "Perdido") ||
      (selectedCategory === "estados" || selectedCategory.endsWith("-estados"));

    // Aplicar filtros avançados para todas as categorias exceto "estados"
    const matchesAdvancedFilters = selectedCategory === "estados" || selectedCategory.endsWith("-estados") || (
      (advancedFilters.status.length === 0 || advancedFilters.status.includes(lead.status)) &&
      (advancedFilters.source.length === 0 || !lead.source || advancedFilters.source.includes(lead.source)) &&
      (advancedFilters.actionType.length === 0 || !lead.action_type || advancedFilters.actionType.includes(lead.action_type)) &&
      (advancedFilters.state.length === 0 || !lead.state || advancedFilters.state.includes(lead.state)) &&
      (advancedFilters.lossReason.length === 0 || !lead.loss_reason || advancedFilters.lossReason.includes(lead.loss_reason))
    );
    
    return matchesSearch && matchesCategory && matchesAdvancedFilters;
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Limpar filtros avançados quando mudar de categoria
    setAdvancedFilters({
      status: [],
      source: [],
      actionType: [],
      state: [],
      lossReason: [],
      valueRange: { min: null, max: null }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises</h1>
          <p className="text-gray-600">Análise detalhada de leads e performance de vendas</p>
        </div>
        <DateFilter date={dateRange} setDate={setDateRange} />
      </div>

      <AnalysisStats leads={leads} onCategoryChange={handleCategoryChange} />

      <CategoryButtons 
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {selectedCategory !== "estados" && (
            <AdvancedFilters 
              onFiltersChange={setAdvancedFilters}
              activeFilters={advancedFilters}
              selectedCategory={selectedCategory}
              lossReasons={lossReasons}
            />
          )}
        </div>
      </Card>

      {/* Gráficos */}
      {shouldShowChart() && (
        <>
          {shouldShowLossReasonsChart() && (
            <LossReasonsChart leads={getLeadsForChart} />
          )}
          
          {shouldShowActionTypesChart() && (
            <ActionTypesChart 
              leads={getLeadsForChart} 
              selectedCategory={selectedCategory}
            />
          )}

          {shouldShowStateChart() && (
            <StateStatsChart leads={getLeadsForChart} />
          )}
        </>
      )}

      {/* Lista de Leads Agrupada */}
      {!shouldShowStateChart() && (
        <>
          {isLoading ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <p>Carregando leads...</p>
              </div>
            </Card>
          ) : (
            <GroupedLeadsList 
              leads={filteredLeads}
              selectedCategory={selectedCategory}
              onViewDetails={handleViewDetails}
              onEditLead={handleEditLead}
            />
          )}
        </>
      )}

      <LeadDetailsDialog
        lead={selectedLead}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onEditLead={handleEditLead}
      />

      <EditLeadForm
        lead={selectedLead}
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
}
