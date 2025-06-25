
import { useMemo } from "react";
import { Lead } from "@/types/lead";

interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export const useAnalysisLogic = (
  leads: Lead[], 
  selectedCategory: string,
  statusHistory: LeadStatusHistory[],
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean
) => {
  const getLeadsForChart = useMemo(() => {
    let categoryFilteredLeads = leads;
    
    // Extrair a categoria principal (antes do hífen se houver)
    const mainCategory = selectedCategory.split('-')[0];
    
    console.log(`🔍 getLeadsForChart - selectedCategory: ${selectedCategory}, mainCategory: ${mainCategory}`);
    
    if (mainCategory === "perdas") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Perdido");
    } else if (mainCategory === "contratos") {
      categoryFilteredLeads = leads.filter(lead => lead.status === "Contrato Fechado");
    } else if (mainCategory === "oportunidades") {
      // NOVA REGRA CORRIGIDA: Oportunidades são leads que:
      // 1. NÃO estão em "Novo" (independente do histórico)
      // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
      categoryFilteredLeads = leads.filter(lead => {
        console.log(`🔍 Analisando lead ${lead.name} (${lead.id}) com status atual: ${lead.status}`);
        
        // PRIMEIRO: Excluir completamente leads com status "Novo"
        if (lead.status === "Novo") {
          console.log(`❌ Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO de oportunidades`);
          return false;
        }
        
        // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
        if (lead.status === "Proposta" || lead.status === "Reunião") {
          console.log(`✅ Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
          return true;
        }
        
        // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
        const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
        console.log(`📊 Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
        
        if (hasPassedThroughTargetStatuses) {
          console.log(`✅ Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
          return true;
        }
        
        console.log(`❌ Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
        return false;
      });
    } else if (selectedCategory === "estados") {
      categoryFilteredLeads = leads;
    }
    // Para categoria "all", retornar todos os leads
    else if (selectedCategory === "all") {
      categoryFilteredLeads = leads;
    }
    
    console.log(`🎯 Total de leads filtrados para ${selectedCategory}:`, categoryFilteredLeads.length);
    console.log(`📋 Leads incluídos:`, categoryFilteredLeads.map(l => `${l.name} (${l.status})`));
    
    return categoryFilteredLeads;
  }, [leads, selectedCategory, statusHistory, hasLeadPassedThroughStatus]);

  // CORREÇÃO: Permitir exibição de gráficos também para categoria "all"
  const shouldShowChart = () => true;
  
  const shouldShowLossReasonsChart = () => {
    console.log(`🔍 shouldShowLossReasonsChart - selectedCategory: ${selectedCategory}`);
    // CORREÇÃO: Mostrar gráfico de motivos de perda quando categoria é "perdas" (clique direto)
    const shouldShow = selectedCategory === "perdas";
    console.log(`📊 shouldShowLossReasonsChart - shouldShow: ${shouldShow} para ${selectedCategory}`);
    return shouldShow;
  };
  
  const shouldShowActionTypesChart = () => {
    console.log(`🔍 shouldShowActionTypesChart - selectedCategory: ${selectedCategory}`);
    // CORREÇÃO: Mostrar gráfico de tipos de ação quando:
    // 1. Categoria principal (contratos, oportunidades) OU
    // 2. Categoria com sufixo -tipo-acao
    // MAS NÃO quando for grupo de ação
    const mainCategory = selectedCategory.split('-')[0];
    const isMainCategory = mainCategory === "contratos" || mainCategory === "oportunidades";
    const isTypeActionCategory = selectedCategory.includes("-tipo-acao");
    const isGroupActionCategory = selectedCategory.includes("-grupo-acao");
    
    // Se for grupo de ação, NÃO mostrar tipo de ação
    if (isGroupActionCategory) {
      const shouldShow = false;
      console.log(`📊 shouldShowActionTypesChart - shouldShow: ${shouldShow} para ${selectedCategory} (grupo de ação)`);
      return shouldShow;
    }
    
    const shouldShow = isMainCategory || isTypeActionCategory;
    console.log(`📊 shouldShowActionTypesChart - shouldShow: ${shouldShow} para ${selectedCategory}`);
    return shouldShow;
  };
  
  const shouldShowActionGroupChart = () => {
    console.log(`🔍 shouldShowActionGroupChart - selectedCategory: ${selectedCategory}`);
    const shouldShow = selectedCategory === "contratos-grupo-acao" || 
                       selectedCategory === "oportunidades-grupo-acao" ||
                       selectedCategory === "perdas-grupo-acao";
    console.log(`📊 shouldShowActionGroupChart - shouldShow: ${shouldShow} para ${selectedCategory}`);
    return shouldShow;
  };
  
  const shouldShowStateChart = () => {
    console.log(`🔍 shouldShowStateChart - selectedCategory: ${selectedCategory}`);
    // CORREÇÃO: Incluir a categoria "estados" principal
    const shouldShow = selectedCategory === "estados" || 
                      selectedCategory === "contratos-estados" || 
                      selectedCategory === "oportunidades-estados" || 
                      selectedCategory === "perdas-estados";
    console.log(`📊 shouldShowStateChart - shouldShow: ${shouldShow} para ${selectedCategory}`);
    return shouldShow;
  };

  return {
    getLeadsForChart,
    shouldShowChart,
    shouldShowLossReasonsChart,
    shouldShowActionTypesChart,
    shouldShowActionGroupChart,
    shouldShowStateChart
  };
};
